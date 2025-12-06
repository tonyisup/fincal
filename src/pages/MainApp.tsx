import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { startOfDay, endOfDay, isBefore, isAfter, addDays } from 'date-fns';
import { Loader2, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
import { ForecastTable, type SortDirection, type SortKey } from '@/components/ForecastTable';
import type { Calendar, CalendarEvent, Transaction, ForecastEntry, UserProfile } from '../types/calendar';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { ForecastCalendar } from '@/components/ForecastCalendar';
import { parseEventTitle, parseGoogleDate } from '@/lib/utils';

interface UserSettings {
  selectedCreditCalendarId: string | undefined;
  selectedDebitCalendarId: string | undefined;
  startBalance: string;
  endDate: string | undefined;
  autoRun: boolean;
  weekStartDay: 0 | 1;
}

interface MainAppProps {
  userProfile: UserProfile | null;
  handleLogout: () => void;
}

// const mockData = [
//   { balance: 2000, amount: 0, summary: "Start", when: new Date(), type: 'initial' },
//   { balance: 1500, amount: 500, summary: "Groceries", when: new Date(new Date().getTime() + 86400000), type: 'debit' },
//   { balance: -200, amount: 2000, summary: "Rent", when: new Date(new Date().getTime() + 86400000 * 5), type: 'debit' },
//   { balance: 500, amount: 700, summary: "Deposit", when: new Date(new Date().getTime() + 86400000 * 6), type: 'credit' },
// ];

export function MainApp({ userProfile, handleLogout }: MainAppProps) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCreditCalendarId, setSelectedCreditCalendarId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved).selectedCreditCalendarId : undefined;
  });
  const [selectedDebitCalendarId, setSelectedDebitCalendarId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved).selectedDebitCalendarId : undefined;
  });
  const [startBalance, setStartBalance] = useState<string>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved).startBalance : "4000";
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved && JSON.parse(saved).endDate ? new Date(JSON.parse(saved).endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  });
  const [weekStartDay, setWeekStartDay] = useState<0 | 1>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved).weekStartDay ?? 0 : 0;
  });
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: null,
    direction: null
  });
  const [startFromTomorrow, setStartFromTomorrow] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [autoRun, setAutoRun] = useState<boolean>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? !!JSON.parse(saved).autoRun : false;
  });

  // Load user-specific settings when userProfile is available
  useEffect(() => {
    if (userProfile?.email) {
      const key = `userSettings_${userProfile.email}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.selectedCreditCalendarId) setSelectedCreditCalendarId(parsed.selectedCreditCalendarId);
          if (parsed.selectedDebitCalendarId) setSelectedDebitCalendarId(parsed.selectedDebitCalendarId);
          if (parsed.startBalance !== undefined) setStartBalance(parsed.startBalance);
          if (parsed.endDate) setEndDate(new Date(parsed.endDate));
          if (parsed.autoRun !== undefined) setAutoRun(parsed.autoRun);
          if (parsed.weekStartDay !== undefined) setWeekStartDay(parsed.weekStartDay);
        } catch (e) {
          console.error("Failed to parse user settings", e);
        }
      }
      setSettingsLoaded(true);
    }
  }, [userProfile]);

  // Save settings to localStorage whenever they change (scoped to user)
  useEffect(() => {
    if (userProfile?.email && settingsLoaded) {
      const settings: UserSettings = {
        selectedCreditCalendarId,
        selectedDebitCalendarId,
        startBalance,
        endDate: endDate?.toISOString(),
        autoRun,
        weekStartDay,
      };
      localStorage.setItem(`userSettings_${userProfile.email}`, JSON.stringify(settings));

      // Also update global settings as a fallback/cache for initial load
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }
  }, [selectedCreditCalendarId, selectedDebitCalendarId, startBalance, endDate, autoRun, weekStartDay, userProfile, settingsLoaded]);

  const fetchCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.gapi.client.request({
        path: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      });
      const items = (response.result as any).items as Calendar[];
      setCalendars(items || []);
    } catch (err: any) {
      console.error("Error fetching calendars:", err);
      setError(`Failed to fetch calendars: ${err.result?.error?.message || err.message}`);
      if (err.result?.error?.status === 'UNAUTHENTICATED') handleLogout();
    } finally {
      setIsLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const fetchEvents = useCallback(async (calendarId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> => {
    try {
      const response = await window.gapi.client.request({
        path: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        params: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        },
      });
      return (response.result as any).items as CalendarEvent[] || [];
    } catch (err: any) {
      console.error(`Error fetching events for ${calendarId}:`, err);
      setError(`Failed to fetch events for calendar ${calendarId}: ${err.result?.error?.message || err.message}`);
      if (err.result?.error?.status === 'UNAUTHENTICATED') handleLogout();
      return [];
    }
  }, [handleLogout]);

  const runForecast = useCallback(async () => {
    if (!selectedCreditCalendarId || !selectedDebitCalendarId || !endDate || !startBalance) {
      // Don't set error here if auto-running, or handle it gracefully.
      // But for manual run it should show error.
      // For now, keeping as is, but maybe we should check if it was triggered automatically.
      // Actually, for auto-run, if fields are missing, we probably just shouldn't run.
      // But the error message "Please fill all fields" might be annoying on load if fields are empty.
      // However, fields are persisted, so they likely aren't empty unless first visit.
      if (!selectedCreditCalendarId || !selectedDebitCalendarId || !endDate || !startBalance) {
         setError("Please fill all fields: Start Balance, End Date, Credit Calendar, and Debit Calendar.");
         return;
      }
    }

    if (!selectedCreditCalendarId || !selectedDebitCalendarId || !endDate || !startBalance) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setForecast([]);

    const numericStartBalance = parseFloat(startBalance);
    if (isNaN(numericStartBalance)) {
      setError("Start balance must be a number.");
      setIsLoading(false);
      return;
    }

    const forecastStartDate = startFromTomorrow
      ? startOfDay(addDays(new Date(), 1))
      : startOfDay(new Date());
    const forecastEndDate = endOfDay(endDate);

    if (isBefore(forecastEndDate, forecastStartDate)) {
      setError("End date cannot be before today.");
      setIsLoading(false);
      return;
    }

    try {
      const creditEventsRaw = await fetchEvents(selectedCreditCalendarId, forecastStartDate, forecastEndDate);
      const debitEventsRaw = await fetchEvents(selectedDebitCalendarId, forecastStartDate, forecastEndDate);

      const transactions: Transaction[] = [];

      creditEventsRaw.forEach(event => {
        const parsedDate = parseGoogleDate(event.start?.date);
        if (parsedDate && (isAfter(parsedDate, forecastStartDate) || parsedDate?.getTime() === forecastStartDate.getTime())) {
          const parsed = parseEventTitle(event.summary);
          if (parsed) {
            transactions.push({ date: parsedDate, amount: parsed.amount, description: parsed.description, type: 'credit' });
          }
        }
      });

      debitEventsRaw.forEach(event => {
        const parsedDate = parseGoogleDate(event.start?.date);
        if (parsedDate && (isAfter(parsedDate, forecastStartDate) || parsedDate?.getTime() === forecastStartDate.getTime())) {
          const parsed = parseEventTitle(event.summary);
          if (parsed) {
            transactions.push({ date: parsedDate, amount: -parsed.amount, description: parsed.description, type: 'debit' });
          }
        }
      });

      transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      const newForecast: ForecastEntry[] = [];
      let currentBalance = numericStartBalance;

      newForecast.push({
        balance: currentBalance,
        amount: 0,
        summary: "Starting Balance",
        when: forecastStartDate,
        type: 'initial',
      });

      transactions.forEach(tx => {
        currentBalance += tx.amount;
        newForecast.push({
          balance: currentBalance,
          amount: Math.abs(tx.amount),
          summary: tx.description,
          when: tx.date,
          type: tx.type,
        });
      });

      newForecast.sort((a, b) => a.when.getTime() - b.when.getTime());
      setForecast(newForecast);

    } catch (err) {
      console.error("Error running forecast:", err);
      setError("An error occurred while generating the forecast.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCreditCalendarId, selectedDebitCalendarId, endDate, startBalance, startFromTomorrow, fetchEvents]);

  useEffect(() => {
    if (autoRun) {
      const timer = setTimeout(() => {
        if (selectedCreditCalendarId && selectedDebitCalendarId && endDate && startBalance) {
             runForecast();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoRun, runForecast, selectedCreditCalendarId, selectedDebitCalendarId, endDate, startBalance]);

  const handleSort = (key: SortKey) => {    
    setSortConfig(current => {
      if (key !== 'when')
      {
        if (current.key !== key) {
          return {
            key,
            direction: 'asc'
          }
        }

        if (current.direction === 'desc')
        {
          return {
            key: 'when',
            direction: 'asc'
          }
        }

        return {
          key,
          direction: (
            (current.direction === 'asc')
            ? 'desc'
            : 'asc'
          ) 
        }
      }
      return {
        key: 'when',
        direction: (
          (current.direction === 'asc')
          ? 'desc'
          : 'asc'
        ) 
      }
    })
  };

  const sortedForecast = [...forecast].sort((a, b) => {
    if (!sortConfig.key) {
      return (a.when.getTime() - b.when.getTime())
    }
    const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    switch (sortConfig.key) {
      case 'balance':
        return (a.balance - b.balance) * directionMultiplier;
      case 'amount':
        return (((a.type === 'debit' ? -1 : 1) * a.amount) - ((b.type === 'debit' ? -1 : 1) * b.amount)) * directionMultiplier;
      case 'summary':
        return a.summary.localeCompare(b.summary) * directionMultiplier;
      case 'when':
        return (a.when.getTime() - b.when.getTime()) * directionMultiplier;
      default:
        return 0;
    }
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Fin Cal</h1>
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={userProfile.picture} alt={userProfile.name} className="w-8 h-8 rounded-full" />
              <span className="text-sm">{userProfile.name}</span>
            </div>
          )}
          <ModeToggle />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-balance">Start Balance</Label>
              <Input
                id="start-balance"
                type="number"
                placeholder="Enter starting balance"
                value={startBalance}
                onChange={(e) => setStartBalance(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Select End Date</Label>
              <DatePicker date={endDate} setDate={setEndDate} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-calendar">Income Calendar</Label>
              <Select key={`credit-${calendars.length}`} value={selectedCreditCalendarId} onValueChange={setSelectedCreditCalendarId}>
                <SelectTrigger id="credit-calendar">
                  <SelectValue placeholder="Select income calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map(calendar => (
                    <SelectItem key={calendar.id} value={calendar.id}>{calendar.summary}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debit-calendar">Expense Calendar</Label>
              <Select key={`debit-${calendars.length}`} value={selectedDebitCalendarId} onValueChange={setSelectedDebitCalendarId}>
                <SelectTrigger id="debit-calendar">
                  <SelectValue placeholder="Select expense calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map(calendar => (
                    <SelectItem key={calendar.id} value={calendar.id}>{calendar.summary}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="week-start">Start of Week</Label>
              <Select value={weekStartDay.toString()} onValueChange={(v) => setWeekStartDay(parseInt(v) as 0 | 1)}>
                <SelectTrigger id="week-start">
                  <SelectValue placeholder="Select start of week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="start-tomorrow"
                checked={startFromTomorrow}
                onCheckedChange={(checked) => setStartFromTomorrow(Boolean(checked))}
              />
              <Label htmlFor="start-tomorrow">Start Forecast from Tomorrow</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-run"
                checked={autoRun}
                onCheckedChange={(checked) => setAutoRun(Boolean(checked))}
              />
              <Label htmlFor="auto-run">Auto Run</Label>
            </div>
          </div>
            <Button onClick={runForecast} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Forecast
                </>
              ) : (
                'Run Forecast'
              )}
            </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('table')}
        >
          <LayoutGrid className="w-4 h-4 mr-2" />
          Table
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('calendar')}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Calendar
        </Button>
      </div>

      {viewMode === 'table' ? (      
        <ForecastTable 
          sortedForecast={sortedForecast}
          handleSort={handleSort}
          sortConfig={sortConfig}
        />
      ) : (
        <ForecastCalendar
          forecast={forecast}
          weekStartDay={weekStartDay}
          startDate={sortedForecast.length > 0 ? sortedForecast[0].when : new Date()}
          endDate={endDate || new Date()}
        />
      )}
    </div>
  );
}
