import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { LogOut, Loader2, ArrowUpDown } from 'lucide-react';
import { cn, parseEventTitle, parseGoogleDate } from '@/lib/utils';
import type { Calendar, CalendarEvent, Transaction, ForecastEntry, UserProfile } from '../types/calendar';

interface UserSettings {
  selectedCreditCalendarId: string | undefined;
  selectedDebitCalendarId: string | undefined;
  startBalance: string;
  endDate: string | undefined;
}

interface MainAppProps {
  userProfile: UserProfile | null;
  handleLogout: () => void;
}

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
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: 'balance' | 'amount' | 'summary' | 'when' | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings: UserSettings = {
      selectedCreditCalendarId,
      selectedDebitCalendarId,
      startBalance,
      endDate: endDate?.toISOString(),
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [selectedCreditCalendarId, selectedDebitCalendarId, startBalance, endDate]);

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

  const fetchEvents = async (calendarId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> => {
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
  };

  const runForecast = async () => {
    if (!selectedCreditCalendarId || !selectedDebitCalendarId || !endDate || !startBalance) {
      setError("Please fill all fields: Start Balance, End Date, Credit Calendar, and Debit Calendar.");
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

    const forecastStartDate = startOfDay(new Date());
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
        if (parsedDate && isAfter(parsedDate, forecastStartDate) || parsedDate?.getTime() === forecastStartDate.getTime()) {
          const parsed = parseEventTitle(event.summary);
          if (parsed) {
            transactions.push({ date: parsedDate, amount: parsed.amount, description: parsed.description, type: 'credit' });
          }
        }
      });

      debitEventsRaw.forEach(event => {
        const parsedDate = parseGoogleDate(event.start?.date);
        if (parsedDate && isAfter(parsedDate, forecastStartDate) || parsedDate?.getTime() === forecastStartDate.getTime()) {
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
  };

  const handleSort = (key: 'balance' | 'amount' | 'summary' | 'when') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedForecast = [...forecast].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    switch (sortConfig.key) {
      case 'balance':
        return (a.balance - b.balance) * directionMultiplier;
      case 'amount':
        return (a.amount - b.amount) * directionMultiplier;
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
        <h1 className="text-3xl font-bold">FinCal</h1>
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={userProfile.picture} alt={userProfile.name} className="w-8 h-8 rounded-full" />
              <span className="text-sm">{userProfile.name}</span>
            </div>
          )}
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
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
              <Select value={selectedCreditCalendarId} onValueChange={setSelectedCreditCalendarId}>
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
              <Select value={selectedDebitCalendarId} onValueChange={setSelectedDebitCalendarId}>
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
          </div>

          <div className="flex gap-4 items-end">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('when')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    When
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('summary')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    Summary
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('amount')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    Amount
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('balance')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    Balance
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedForecast.map((entry, index) => (
                <TableRow key={index} className={cn(
                  entry.type === 'credit' ? 'bg-green-50 dark:bg-green-950/20' : entry.type === 'debit' ? 'bg-red-50 dark:bg-red-950/20' : '',
                )}>
                  <TableCell>{format(entry.when, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{entry.summary}</TableCell>
                  <TableCell className={entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {entry.type === 'debit' ? '-' : '+'}${entry.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>${entry.balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
