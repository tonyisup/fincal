import React, { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addDays, isAfter, isBefore } from 'date-fns';
import { Info, Plus, Minus, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ForecastEntry } from '../types/calendar';
import { Button } from './ui/button';

export type WarningStyle = 'Row Background' | 'Text Color' | 'Balance Color';
interface ForecastCalendarProps {
  forecast: ForecastEntry[];
  weekStartDay: 0 | 1;
  startDate: Date;
  endDate: Date;
  onAddTransaction: (date: Date, type: 'credit' | 'debit') => void;
  warningAmount: number;
  warningColor: string;
  warningOperator: '<' | '<=';
  warningStyle: WarningStyle;
}

interface WeekData {
  start: Date;
  end: Date;
  days: Date[];
  transactions: ForecastEntry[];
  startBalance: number;
}

const colors = {
  green: '#86efac',
  red: '#f87171',
}

export function ForecastCalendar({ forecast, weekStartDay, startDate, endDate, onAddTransaction, warningAmount, warningColor, warningOperator, warningStyle }: ForecastCalendarProps) {
  // 1. Calculate Global Min/Max Balance for Y-Axis Scaling
  // 1. Calculate Dynamic Min/Max Balance Strategy (Smoothed Sliding Window)
  const getScale = useMemo(() => {
    if (forecast.length === 0) return () => ({ min: 0, max: 100 });

    // Pre-calculate daily balances for the entire covered range
    // We'll pad the range by 30 days to handle the window at edges if possible, 
    // but we only have forecast data. We'll stick to the forecast range.
    // Assuming forecast is sorted by date.
    const sortedForecast = [...forecast].sort((a, b) => a.when.getTime() - b.when.getTime());
    if (sortedForecast.length === 0) return () => ({ min: 0, max: 100 });

    const rangeStart = startOfWeek(startDate, { weekStartsOn: weekStartDay });
    const rangeEnd = endOfWeek(endDate, { weekStartsOn: weekStartDay });

    // Create a map of daily balances
    const balanceMap = new Map<string, number>();
    let currentBalance = sortedForecast.length > 0 ? sortedForecast[0].balance : 0;

    // We need to fill balances from rangeStart to rangeEnd
    // Note: optimization possible, but looping days is safe for typical ranges (~1-2 years = 700 days)
    const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    let forecastIdx = 0;
    const dailyBalances: number[] = [];

    allDays.forEach(day => {
      // Advance forecast index to current day
      while (forecastIdx < sortedForecast.length && isBefore(sortedForecast[forecastIdx].when, day)) {
        // Transaction happened before this day starts? 
        // Actually forecast 'when' usually has time.
        // If strict inequality: transaction is earlier.
        currentBalance = sortedForecast[forecastIdx].balance;
        forecastIdx++;
      }
      // Also check transactions ON this day (up to end of day?)
      // The balance at the "end of the day" or "start"?
      // Let's assume we want the balance relevant for this day. 
      // If we process all transactions on this day, we get end-of-day balance.
      let tempIdx = forecastIdx;
      while (tempIdx < sortedForecast.length && isSameDay(sortedForecast[tempIdx].when, day)) {
        currentBalance = sortedForecast[tempIdx].balance;
        tempIdx++;
      }
      // We don't advance forecastIdx permanently here because we loop day by day. 
      // Actually, since allDays is sequential, we CAN advance.
      forecastIdx = tempIdx;

      balanceMap.set(format(day, 'yyyy-MM-dd'), currentBalance);
      dailyBalances.push(currentBalance);
    });

    // Valid helper to get balance (clamped to edges if date out of range, though we cover range)
    const getB = (idx: number) => dailyBalances[Math.max(0, Math.min(dailyBalances.length - 1, idx))];

    // 1st Pass: Sliding Window Min/Max (30 day window -> +/- 15 days)
    const WINDOW_HALF_SIZE = 15;
    const rollingStats = dailyBalances.map((_, i) => {
      let min = Infinity;
      let max = -Infinity;
      for (let offset = -WINDOW_HALF_SIZE; offset <= WINDOW_HALF_SIZE; offset++) {
        const val = getB(i + offset);
        if (val < min) min = val;
        if (val > max) max = val;
      }
      return { min, max };
    });

    // 2nd Pass: Smoothing (Running Average of the Min/Max) - e.g. over 15 days
    const SMOOTH_HALF_SIZE = 7;
    const smoothedScales = new Map<string, { min: number, max: number }>();

    allDays.forEach((day, i) => {
      let sumMin = 0;

      // User asked for "Running average of the min and max". 
      // Averaging the Max might clip peaks.
      // But averaging Min/Max gives a stable "envelope".
      // Let's implement Average for both as requested.

      let sumMax = 0;
      let count = 0;

      for (let offset = -SMOOTH_HALF_SIZE; offset <= SMOOTH_HALF_SIZE; offset++) {
        const idx = Math.max(0, Math.min(dailyBalances.length - 1, i + offset));
        sumMin += rollingStats[idx].min;
        sumMax += rollingStats[idx].max;
        count++;
      }

      const avgMin = sumMin / count;
      const avgMax = sumMax / count;

      // Add padding (10% of range)
      const range = avgMax - avgMin;
      const padding = range * 0.1;

      smoothedScales.set(format(day, 'yyyy-MM-dd'), {
        min: avgMin - padding,
        max: avgMax + padding
      });
    });

    return (date: Date) => {
      return smoothedScales.get(format(date, 'yyyy-MM-dd')) || { min: 0, max: 100 };
    };

  }, [forecast, startDate, endDate, weekStartDay]);

  // 2. Organize data into weeks
  const weeks = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = startOfWeek(startDate, { weekStartsOn: weekStartDay });
    const end = endOfWeek(endDate, { weekStartsOn: weekStartDay });

    const weeksList: WeekData[] = [];
    let currentWeekStart = start;

    // Helper to find balance at a specific time
    // We assume forecast is sorted by time
    const getBalanceAt = (date: Date) => {
      // Find the last transaction before or at this date
      // If none, use the very first balance or 0
      // Since forecast is sorted:
      let lastBalance = forecast.length > 0 ? forecast[0].balance : 0; // Default to first known balance?
      // Actually, if date is BEFORE first forecast entry, we don't know.
      // But usually forecast starts with "Starting Balance".

      for (let i = 0; i < forecast.length; i++) {
        if (isAfter(forecast[i].when, date)) {
          break;
        }
        lastBalance = forecast[i].balance;
      }
      return lastBalance;
    };

    while (currentWeekStart <= end) {
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: weekStartDay });
      const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

      // Filter transactions that fall within this week
      // We include transactions from the very beginning of the week up to the end
      const weekTransactions = forecast.filter(f =>
        (isAfter(f.when, currentWeekStart) || f.when.getTime() === currentWeekStart.getTime()) &&
        (isBefore(f.when, currentWeekEnd) || f.when.getTime() === currentWeekEnd.getTime())
      );

      // We also need the balance at the exact start of the week for the graph
      const startBalance = getBalanceAt(currentWeekStart);

      weeksList.push({
        start: currentWeekStart,
        end: currentWeekEnd,
        days,
        transactions: weekTransactions,
        startBalance
      });

      currentWeekStart = addDays(currentWeekStart, 7);
    }
    return weeksList;
  }, [startDate, endDate, weekStartDay, forecast]);

  // Calendar Header
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: weekStartDay });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [weekStartDay]);

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekDays.map((day, i) => (
          <div key={i} className="p-2 text-center text-sm font-medium">
            <span>{format(day, 'EEE')}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y">
        {weeks.map((week, i) => (
          <WeekRow
            key={i}
            week={week}
            minBalance={getScale(week.start).min ?? 0}
            maxBalance={getScale(week.start).max ?? 100}
            onAddTransaction={onAddTransaction}
            warningAmount={warningAmount}
            warningColor={warningColor}
            warningOperator={warningOperator}
            warningStyle={warningStyle}
          />
        ))}
      </div>
    </div>
  );

}

function WeekRow({ week, minBalance, maxBalance, onAddTransaction, warningAmount, warningColor, warningOperator, warningStyle }: { week: WeekData, minBalance: number, maxBalance: number, onAddTransaction: (date: Date, type: 'credit' | 'debit') => void, warningAmount: number, warningColor: string, warningOperator: '<' | '<=', warningStyle: WarningStyle }) {
  // SVG Dimensions
  const height = 100;
  const width = 1000; // Arbitrary units for SVG coordinate system

  // Calculate SVG Path and Vertical Lines
  const { pathData, verticalLines, renderMin, renderMax, dailyBalances } = useMemo(() => {
    // 1. Determine the actual value range for this week to prevent clipping
    let wMin = week.startBalance;
    let wMax = week.startBalance;
    week.transactions.forEach(t => {
      if (t.balance < wMin) wMin = t.balance;
      if (t.balance > wMax) wMax = t.balance;
    });

    // 2. Add padding to local bounds (match the 10% logic or enough to clear stroke)
    const wRange = wMax - wMin;
    const wPadding = (wRange === 0 ? 100 : wRange) * 0.1;
    const safeMin = wMin - wPadding;
    const safeMax = wMax + wPadding;

    // 3. Merge with the Smooth/Global Scale passed in
    // This ensures we follow the trend BUT expand if the trend is too tight
    const rMin = Math.min(minBalance, safeMin);
    const rMax = Math.max(maxBalance, safeMax);

    const getY = (balance: number) => {
      // Scale balance between renderMin and renderMax
      const range = rMax - rMin;
      const normalized = range === 0 ? 0.5 : (balance - rMin) / range;
      return 100 - (normalized * 100);
    };

    let d = `M 0 ${getY(week.startBalance)}`;
    const verticalLinesData: Array<{ x: number; y1: number; y2: number; isDebit: boolean }> = [];

    let currentBalance = week.startBalance;

    // Sort transactions just in case
    const sorted = [...week.transactions].sort((a, b) => a.when.getTime() - b.when.getTime());

    // Group transactions by day
    const transactionsByDay = new Map<number, ForecastEntry[]>();
    sorted.forEach(tx => {
      const dayIndex = week.days.findIndex(day => isSameDay(day, tx.when));
      if (dayIndex !== -1) {
        if (!transactionsByDay.has(dayIndex)) {
          transactionsByDay.set(dayIndex, []);
        }
        transactionsByDay.get(dayIndex)!.push(tx);
      }
    });

    // Map to store end-of-day balances for DayCell highlighting
    const dailyBalances = new Map<number, number>();

    // Process transactions day by day, distributing them evenly within each day
    week.days.forEach((_, dayIndex) => {
      const dayTransactions = transactionsByDay.get(dayIndex) || [];

      const dayStartX = (dayIndex / 7) * width;
      const dayEndX = ((dayIndex + 1) / 7) * width;

      if (dayTransactions.length === 0) {
        // No transactions in this day - continue horizontally at current balance
        d += ` L ${dayEndX} ${getY(currentBalance)}`;
        dailyBalances.set(dayIndex, currentBalance);
        return;
      }

      const dayWidth = dayEndX - dayStartX;
      const spacing = dayWidth / (dayTransactions.length + 1);

      dayTransactions.forEach((tx, txIndex) => {
        const x = dayStartX + (txIndex + 1) * spacing;
        const yPrev = getY(currentBalance);
        const yNew = getY(tx.balance);

        // Draw horizontal line to the time of transaction at previous balance (step function)
        d += ` L ${x} ${yPrev}`;

        // Store vertical line separately - will be drawn on top with appropriate color
        verticalLinesData.push({
          x,
          y1: yPrev,
          y2: yNew,
          isDebit: tx.type === 'debit'
        });

        // Include vertical line in path for continuity (will be overridden by colored line above)
        d += ` L ${x} ${yNew}`;
        currentBalance = tx.balance;
      });

      // After all transactions in the day, continue to end of day at current balance
      d += ` L ${dayEndX} ${getY(currentBalance)}`;
      dailyBalances.set(dayIndex, currentBalance);
    });

    // Draw to end of week
    d += ` L ${width} ${getY(currentBalance)}`;

    return { pathData: d, verticalLines: verticalLinesData, renderMin: rMin, renderMax: rMax, dailyBalances };
  }, [week, minBalance, maxBalance]);

  // Calculate Gradient Zero-Crossing
  // We want Green above 0 (visually higher, lower Y) and Red below 0
  const zeroYPercentage = useMemo(() => {
    if (renderMin > 0) return 100; // All green (0 is below graph)
    if (renderMax < 0) return 0;   // All red (0 is above graph)

    // 0 is somewhere in between
    const range = renderMax - renderMin;
    const zeroPos = (0 - renderMin) / range;
    // zeroPos is 0..1 where 0 is minBalance (bottom) and 1 is maxBalance (top)
    // In SVG Y terms (0 at top, 100 at bottom):
    // Y for 0 = 100 - (zeroPos * 100)
    return (1 - zeroPos) * 100;
  }, [renderMin, renderMax]);

  const uniqueId = React.useId();

  return (
    <div className="relative grid grid-cols-7 min-h-[120px]">
      {/* Background Grid Cells */}
      {week.days.map((day, i) => (
        <DayCell
          key={i}
          day={day}
          transactions={week.transactions.filter(t => isSameDay(t.when, day))}
          onAddTransaction={onAddTransaction}
          currentBalance={dailyBalances.get(i) ?? week.startBalance}
          warningAmount={warningAmount}
          warningColor={warningColor}
          warningOperator={warningOperator}
          warningStyle={warningStyle}
        />
      ))}

      {/* SVG Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`gradient-${uniqueId}`}
              x1="0"
              x2="0"
              y1="0"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              {/* Top part (Green) until zero line */}
              <stop offset="0%" stopColor={colors.green} />
              <stop offset={`${Math.max(0, Math.min(100, zeroYPercentage))}%`} stopColor={colors.green} />
              {/* Bottom part (Red) after zero line */}
              <stop offset={`${Math.max(0, Math.min(100, zeroYPercentage))}%`} stopColor={colors.red} />
              <stop offset="100%" stopColor={colors.red} />
            </linearGradient>

            {/* Filter for glow/shadow effect if desired */}
            <filter id={`shadow-${uniqueId}`}>
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
            </filter>
          </defs>

          <path
            d={pathData}
            fill="none"
            stroke={`url(#gradient-${uniqueId})`}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#shadow-${uniqueId})`}
          />
          {/* Vertical lines for transactions - red for debits, green for credits */}
          {verticalLines.map((line, idx) => {
            // Only render if line has actual length
            if (Math.abs(line.y2 - line.y1) < 0.1) return null;
            return (
              <line
                key={`vline-${idx}`}
                x1={line.x}
                y1={line.y1}
                x2={line.x}
                y2={line.y2}
                stroke={line.isDebit ? colors.red : colors.green}
                strokeWidth="5"
                opacity="1"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DayCell({ day, transactions, onAddTransaction, currentBalance, warningAmount, warningColor, warningOperator, warningStyle }: { day: Date, transactions: ForecastEntry[], onAddTransaction: (date: Date, type: 'credit' | 'debit') => void, currentBalance: number, warningAmount: number, warningColor: string, warningOperator: '<' | '<=', warningStyle: WarningStyle }) {
  const isToday = isSameDay(day, new Date());
  const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : currentBalance;

  const onEditDay = (date: Date) => {
    window.open(`https://calendar.google.com/calendar/u/0/r/day/${format(date, 'yyyy')}/${format(date, 'MM')}/${format(date, 'dd')}`, '_blank');
  };

  const isWarning = warningOperator === '<' ? currentBalance < warningAmount : currentBalance <= warningAmount;

  return (
    <div
      id={`day-${format(day, 'yyyy-MM-dd')}`}
      className={cn(
        "border-r min-h-[120px] p-2 flex flex-col justify-between relative group hover:bg-muted/10 transition-colors",
        isToday && "bg-blue-400/20",
        (format(day, 'd') == '1') && "bg-gray-400/20"
      )}
      style={{
        backgroundColor: (isWarning && warningStyle === 'Row Background') ? warningColor : undefined,
      }}
    >
      <div className="flex justify-between items-center">
        <span className={cn(
          transactions.length > 0 ? "text-foreground font-medium" : "text-muted-foreground text-sm",
          "h-7 w-7 flex items-center justify-center rounded-full",
          isToday && "bg-primary text-primary-foreground"
        )}
          style={{
            color: (isWarning && warningStyle === 'Text Color') ? warningColor : undefined,
          }}
        >
          {format(day, 'd')}
        </span>
        <span>{(format(day, 'd') == '1') && format(day, 'MMM')}</span>
      </div>

      {/* Hover Buttons */}
      <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 group-hover:delay-700 z-20 pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto bg-background/80 p-1 rounded-md shadow-sm backdrop-blur-sm">
          <Button
            onClick={() => onAddTransaction(day, 'credit')}
            title="Add Income"
            variant="ghost"
            style={{ color: colors.green }}
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
          <Button
            onClick={() => onAddTransaction(day, 'debit')}
            title="Add Expense"
            variant="ghost"
            style={{ color: colors.red }}
            size="icon"
          >
            <Minus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Show balance on hover at the bottom? Or maybe just let the popover handle details.
          The user said: "no words but include the amounts on hover or tap."
          The popover handles tap/click.
          For hover, maybe we can show the end-of-day balance at the bottom of the cell.
      */}
      <div className="flex justify-between items-center">

        {transactions.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-auto">
                <Info className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium border-b pb-2 flex items-center justify-between">
                  <span>{format(day, 'MMMM d, yyyy')}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEditDay(day)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {transactions.map((tx, idx) => (
                    <div key={idx} className="flex justify-between text-sm items-center">
                      <span className="truncate flex-1 mr-2" title={tx.summary}>{tx.summary}</span>
                      <span className={tx.type == 'debit' ? 'text-red-500' : 'text-green-500'}>
                        {tx.type == 'debit' ? '-' : '+'}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-medium mt-2">
                    <span>End Balance</span>
                    <span className={finalBalance ?? 0 <= 0 ? 'text-red-500' : 'text-green-500'}>${finalBalance?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {finalBalance !== null && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-right font-mono text-muted-foreground mt-auto z-20 pointer-events-none">
            ${finalBalance.toFixed(0)}
          </div>
        )}
      </div>
    </div>
  );
}
