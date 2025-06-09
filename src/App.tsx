import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker"; // Assuming you have this or use Shadcn's popover+calendar
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { Calendar as CalendarIcon, LogOut, Loader2 } from 'lucide-react';
import { cn, parseEventTitle, parseGoogleDate } from '@/lib/utils';
import type { Calendar, CalendarEvent, Transaction, ForecastEntry } from './types/calendar';

// Load Google API client library
const loadGapiClient = () => {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY, // Optional but good practice
          // discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"], // Not strictly needed with direct calls
        })
        .then(() => resolve())
        .catch((err) => reject(err));
      });
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};


function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCreditCalendarId, setSelectedCreditCalendarId] = useState<string | undefined>();
  const [selectedDebitCalendarId, setSelectedDebitCalendarId] = useState<string | undefined>();
  const [startBalance, setStartBalance] = useState<string>("4000");
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())); // Default to ~1 month from now
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGapiClient().then(() => setGapiLoaded(true)).catch(console.error);
  }, []);

  const fetchCalendars = useCallback(async () => {
    if (!isSignedIn || !gapiLoaded) return;
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
  }, [isSignedIn, gapiLoaded]);

  useEffect(() => {
    if (isSignedIn && gapiLoaded) {
      fetchCalendars();
    }
  }, [isSignedIn, gapiLoaded, fetchCalendars]);


  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Login Success:", tokenResponse);
      // Store token for gapi client
      window.gapi.client.setToken({ access_token: tokenResponse.access_token });
      setIsSignedIn(true);
    },
    onError: (errorResponse) => {
      console.error("Login Failed:", errorResponse);
      setError("Google login failed.");
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
  });

  const handleLogout = () => {
    googleLogout();
    window.gapi.client.setToken(null); // Clear token for gapi
    setIsSignedIn(false);
    setCalendars([]);
    setSelectedCreditCalendarId(undefined);
    setSelectedDebitCalendarId(undefined);
    setForecast([]);
  };

  const fetchEvents = async (calendarId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> => {
    if (!gapiLoaded || !isSignedIn) return [];
    try {
      const response = await window.gapi.client.request({
        path: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        params: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true, // Expand recurring events
          orderBy: 'startTime',
          maxResults: 250, // Adjust as needed
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

    const forecastStartDate = startOfDay(new Date()); // Today
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
        if (parsedDate && isAfter(parsedDate, forecastStartDate) || parsedDate?.getTime() === forecastStartDate.getTime() ) { // Ensure events are within range (Google might return events starting just before timeMin if they span across)
          const parsed = parseEventTitle(event.summary);
          if (parsed) {
            transactions.push({ date: parsedDate, amount: parsed.amount, description: parsed.description, type: 'credit' });
          }
        }
      });

      debitEventsRaw.forEach(event => {
        const parsedDate = parseGoogleDate(event.start?.date);
         if (parsedDate && isAfter(parsedDate, forecastStartDate) || parsedDate?.getTime() === forecastStartDate.getTime() ) {
          const parsed = parseEventTitle(event.summary);
          if (parsed) {
            transactions.push({ date: parsedDate, amount: -parsed.amount, description: parsed.description, type: 'debit' });
          }
        }
      });

      // Sort transactions by date, then by type (credits first if on same day, though usually not critical)
      transactions.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        if (a.type === 'credit' && b.type === 'debit') return -1;
        if (a.type === 'debit' && b.type === 'credit') return 1;
        return 0;
      });

      const newForecast: ForecastEntry[] = [];
      let currentBalance = numericStartBalance;

      // Add initial balance entry - using a date slightly before the first transaction or today
      const initialEntryDate = transactions.length > 0 ? new Date(Math.min(forecastStartDate.getTime(), transactions[0].date.getTime() - 86400000)) : forecastStartDate; // one day before first transaction or today
      
      newForecast.push({
        balance: currentBalance,
        amount: numericStartBalance, // Or 0 if you don't want to show it as a transaction
        summary: "Starting Balance",
        when: initialEntryDate, // Use today or a date before the first transaction
        type: 'initial',
      });

      transactions.forEach(tx => {
        currentBalance += tx.amount;
        newForecast.push({
          balance: currentBalance,
          amount: Math.abs(tx.amount), // Display as positive
          summary: tx.description,
          when: tx.date,
          type: tx.type,
        });
      });
      
      // Sort final forecast by date to ensure initial balance is first if it's on the same day as first transaction
      newForecast.sort((a, b) => a.when.getTime() - b.when.getTime());

      setForecast(newForecast);

    } catch (err) {
      console.error("Error running forecast:", err);
      setError("An error occurred while generating the forecast.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!gapiLoaded) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> Loading Google API...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Budget Forecast</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p>Please sign in with Google to continue.</p>
            <Button onClick={() => login()} disabled={!gapiLoaded || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign in with Google
            </Button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Budget Forecast</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </header>

      {error && <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-100 rounded-md">{error}</div>}

      <Card className="mb-6">
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          <Button onClick={runForecast} disabled={isLoading || !selectedCreditCalendarId || !selectedDebitCalendarId || !endDate || !startBalance}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
            Run Forecast
          </Button>
        </CardContent>
      </Card>

      {forecast.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Forecast Results</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">${entry.balance.toFixed(2)}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      entry.type === 'credit' ? "text-green-500" : "",
                      entry.type === 'debit' ? "text-red-500" : "",
                      entry.type === 'initial' ? "text-gray-500" : ""
                    )}>
                      {entry.type === 'initial' ? "" : `${entry.type === 'credit' ? '+' : '-'}$${entry.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell>{entry.summary}</TableCell>
                    <TableCell className="text-right">{format(entry.when, 'MM-dd-yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default App;