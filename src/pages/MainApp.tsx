import { useState, useEffect, useCallback } from 'react';
import { googleLogout } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { LogOut, Loader2, TrendingUpDown, ArrowUpDown } from 'lucide-react';
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

  const getSortedForecast = () => {
    if (!sortConfig.key) return forecast;

    return [...forecast].sort((a, b) => {
      const key = sortConfig.key!;

      if (key === 'when') {
        return sortConfig.direction === 'asc'
          ? a.when.getTime() - b.when.getTime()
          : b.when.getTime() - a.when.getTime();
      }

      if (key === 'balance' || key === 'amount') {
        return sortConfig.direction === 'asc'
          ? a[key] - b[key]
          : b[key] - a[key];
      }

      return sortConfig.direction === 'asc'
        ? String(a[key]).localeCompare(String(b[key]))
        : String(b[key]).localeCompare(String(a[key]));
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 w-full">
      <header className="flex justify-between items-center mb-6 w-full max-w-6xl">
        <h1 className="text-2xl font-bold">FinCal Dashboard</h1>
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="flex items-center gap-2">
              <img
                src={userProfile.picture}
                alt={userProfile.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm text-muted-foreground">{userProfile.email}</span>
            </div>
          )}
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      {error && <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-100 rounded-md w-full max-w-6xl">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="creditCalendar">Select a Credit Account (Income)</Label>
                <Select onValueChange={setSelectedCreditCalendarId} value={selectedCreditCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select income calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map(cal => (
                      <SelectItem key={cal.id} value={cal.id}>{cal.summary}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="debitCalendar">Select a Debit Account (Bills)</Label>
                <Select onValueChange={setSelectedDebitCalendarId} value={selectedDebitCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bills calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map(cal => (
                      <SelectItem key={cal.id} value={cal.id}>{cal.summary}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startBalance">Current Balance</Label>
                <Input
                  id="startBalance"
                  type="number"
                  value={startBalance}
                  onChange={(e) => setStartBalance(e.target.value)}
                  placeholder="e.g., 4000"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Forecast End Date</Label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
              <Button onClick={runForecast} disabled={isLoading || !selectedCreditCalendarId || !selectedDebitCalendarId || !endDate || !startBalance} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUpDown className="mr-2 h-4 w-4" />}
                Run Forecast
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {forecast.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('when')}>
                    <div className="flex items-center gap-1">When <ArrowUpDown className="h-4 w-4" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('summary')}>
                    <div className="flex items-center gap-1">Summary <ArrowUpDown className="h-4 w-4" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('amount')}>
                    <div className="flex items-center gap-1">Amount <ArrowUpDown className="h-4 w-4" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('balance')}>
                    <div className="flex items-center gap-1">Balance <ArrowUpDown className="h-4 w-4" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedForecast().map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(entry.when, 'MM-dd-yyyy')}</TableCell>
                    <TableCell>{entry.summary}</TableCell>
                    <TableCell className={cn(
                      entry.type === 'credit' ? "text-green-500" : "",
                      entry.type === 'debit' ? "text-red-500" : ""
                    )}>
                      {entry.type === 'initial' ? "" : `${entry.type === 'credit' ? '+' : '-'}$${entry.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell className={cn("font-medium", entry.balance <= 0 ? "text-red-500" : "")}>
                      ${entry.balance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card className="flex flex-col items-center justify-center h-full p-8 text-center">
                <CardContent>
                    <h3 className="text-xl font-semibold">Welcome to FinCal</h3>
                    <p className="text-muted-foreground mt-2">Your financial forecast will appear here once you've configured your settings and run the forecast.</p>
                </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
