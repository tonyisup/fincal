import React, { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addDays, isAfter, isBefore } from 'date-fns';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ForecastEntry } from '../types/calendar';

interface ForecastCalendarProps {
  forecast: ForecastEntry[];
  weekStartDay: 0 | 1;
  startDate: Date;
  endDate: Date;
}

interface WeekData {
  start: Date;
  end: Date;
  days: Date[];
  transactions: ForecastEntry[];
  startBalance: number;
}

export function ForecastCalendar({ forecast, weekStartDay, startDate, endDate }: ForecastCalendarProps) {
  // 1. Calculate Global Min/Max Balance for Y-Axis Scaling
  const { minBalance, maxBalance } = useMemo(() => {
    if (forecast.length === 0) return { minBalance: 0, maxBalance: 100 };
    let min = Infinity;
    let max = -Infinity;
    forecast.forEach(f => {
      if (f.balance < min) min = f.balance;
      if (f.balance > max) max = f.balance;
    });
    // Add some padding
    const padding = (max - min) * 0.1;
    return { minBalance: min - padding, maxBalance: max + padding };
  }, [forecast]);

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
            {format(day, 'EEE')}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y">
        {weeks.map((week, i) => (
          <WeekRow
            key={i}
            week={week}
            minBalance={minBalance}
            maxBalance={maxBalance}
          />
        ))}
      </div>
    </div>
  );
}

function WeekRow({ week, minBalance, maxBalance }: { week: WeekData, minBalance: number, maxBalance: number }) {
  // SVG Dimensions
  const height = 100;
  const width = 1000; // Arbitrary units for SVG coordinate system

  // Calculate SVG Path
  const pathData = useMemo(() => {
    const totalSeconds = 7 * 24 * 60 * 60;
    const weekStartTime = week.start.getTime();

    // Helper to scale X and Y
    const getX = (date: Date) => {
      const diff = (date.getTime() - weekStartTime) / 1000;
      return (diff / totalSeconds) * width;
    };

    const getY = (balance: number) => {
      // Invert Y because SVG coordinates go down
      // Scale balance between min and max
      // If max == min, avoid division by zero
      const range = maxBalance - minBalance;
      const normalized = range === 0 ? 0.5 : (balance - minBalance) / range;
      // We want maxBalance to be at Y=10 (padding) and minBalance at Y=90
      // Actually let's use full height 0-100 for simplicity, maybe with 5px padding
      return 100 - (normalized * 100);
    };

    let d = `M 0 ${getY(week.startBalance)}`;

    let currentBalance = week.startBalance;

    // Sort transactions just in case
    const sorted = [...week.transactions].sort((a, b) => a.when.getTime() - b.when.getTime());

    sorted.forEach(tx => {
      const x = getX(tx.when);
      const yPrev = getY(currentBalance);
      const yNew = getY(tx.balance);

      // Draw line to the time of transaction at previous balance (step function)
      d += ` L ${x} ${yPrev}`;
      // Draw vertical line to new balance
      d += ` L ${x} ${yNew}`;

      currentBalance = tx.balance;
    });

    // Draw to end of week
    d += ` L ${width} ${getY(currentBalance)}`;

    return d;
  }, [week, minBalance, maxBalance]);

  // Calculate Gradient Zero-Crossing
  // We want Green above 0 (visually higher, lower Y) and Red below 0
  const zeroYPercentage = useMemo(() => {
    if (minBalance > 0) return 100; // All green (0 is below graph)
    if (maxBalance < 0) return 0;   // All red (0 is above graph)

    // 0 is somewhere in between
    const range = maxBalance - minBalance;
    const zeroPos = (0 - minBalance) / range;
    // zeroPos is 0..1 where 0 is minBalance (bottom) and 1 is maxBalance (top)
    // In SVG Y terms (0 at top, 100 at bottom):
    // Y for 0 = 100 - (zeroPos * 100)
    return (1 - zeroPos) * 100;
  }, [minBalance, maxBalance]);

  const uniqueId = React.useId();

  return (
    <div className="relative grid grid-cols-7 min-h-[120px]">
      {/* Background Grid Cells */}
      {week.days.map((day, i) => (
         <DayCell
           key={i}
           day={day}
           transactions={week.transactions.filter(t => isSameDay(t.when, day))}
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
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset={`${Math.max(0, Math.min(100, zeroYPercentage))}%`} stopColor="#22c55e" />
              {/* Bottom part (Red) after zero line */}
              <stop offset={`${Math.max(0, Math.min(100, zeroYPercentage))}%`} stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
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
        </svg>
      </div>
    </div>
  );
}

function DayCell({ day, transactions }: { day: Date, transactions: ForecastEntry[] }) {
  const isToday = isSameDay(day, new Date());
  const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : null;

  return (
    <div className={cn(
      "border-r min-h-[120px] p-2 flex flex-col justify-between relative group hover:bg-muted/10 transition-colors",
      isToday && "bg-muted/20"
    )}>
      <div className="flex justify-between items-start">
        <span className={cn(
          "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
          isToday && "bg-primary text-primary-foreground"
        )}>
          {format(day, 'd')}
        </span>

        {transactions.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Info className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium border-b pb-2">{format(day, 'MMMM d, yyyy')}</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {transactions.map((tx, idx) => (
                    <div key={idx} className="flex justify-between text-sm items-center">
                      <span className="truncate flex-1 mr-2" title={tx.summary}>{tx.summary}</span>
                      <span className={tx.amount < 0 ? 'text-red-500' : 'text-green-500'}>
                        {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-medium mt-2">
                    <span>End Balance</span>
                    <span>${finalBalance?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Show balance on hover at the bottom? Or maybe just let the popover handle details.
          The user said: "no words but include the amounts on hover or tap."
          The popover handles tap/click.
          For hover, maybe we can show the end-of-day balance at the bottom of the cell.
      */}
      {finalBalance !== null && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-right font-mono text-muted-foreground mt-auto z-20 pointer-events-none">
          ${finalBalance.toFixed(0)}
        </div>
      )}
    </div>
  );
}
