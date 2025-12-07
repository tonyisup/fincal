import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { startOfDay, endOfDay, isBefore, isAfter, addDays, addMonths, addYears, format } from 'date-fns';
import { Loader2, LayoutGrid, Calendar as CalendarIcon, LogOut, ChevronDown, Search, Plus } from 'lucide-react';
import { ForecastTable, type SortDirection, type SortKey } from '@/components/ForecastTable';
import type { Calendar, CalendarEvent, Transaction, ForecastEntry, UserProfile } from '../types/calendar';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { ForecastCalendar } from '@/components/ForecastCalendar';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { parseEventTitle, parseGoogleDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, InputGroupButton } from '@/components/ui/input-group';
import { ButtonGroup } from '@/components/ui/button-group';

interface UserSettings {
  selectedCreditCalendarId: string | undefined;
  selectedDebitCalendarId: string | undefined;
  startBalance: string;
  timespan: string;
  autoRun: boolean;
  weekStartDay: 0 | 1;
  viewMode: 'table' | 'calendar';
}

interface MainAppProps {
  userProfile: UserProfile | null;
  accessToken: string | null;
  handleLogout: () => void;
  hasWriteAccess: boolean;
  grantWriteAccess: () => Promise<boolean>;
}

export function MainApp({ userProfile, accessToken, handleLogout, hasWriteAccess, grantWriteAccess }: MainAppProps) {
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
  const [timespan, setTimespan] = useState<string>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved && JSON.parse(saved).timespan ? JSON.parse(saved).timespan : '1M';
  });
  const [weekStartDay, setWeekStartDay] = useState<0 | 1>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved).weekStartDay ?? 0 : 0;
  });
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? (JSON.parse(saved).viewMode || 'calendar') : 'calendar';
  });

  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  // State for Add Transaction Dialog
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [addTransactionDefaults, setAddTransactionDefaults] = useState<{ date?: Date, type?: 'credit' | 'debit' }>({});

  const handleAddTransaction = useCallback((date?: Date, type?: 'credit' | 'debit') => {
    setAddTransactionDefaults({ date, type });
    setIsAddTransactionOpen(true);
  }, []);

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
          if (parsed.timespan) setTimespan(parsed.timespan);
          if (parsed.autoRun !== undefined) setAutoRun(parsed.autoRun);
          if (parsed.weekStartDay !== undefined) setWeekStartDay(parsed.weekStartDay);
          if (parsed.viewMode) setViewMode(parsed.viewMode);
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
        timespan,
        autoRun,
        weekStartDay,
        viewMode,
      };
      localStorage.setItem(`userSettings_${userProfile.email}`, JSON.stringify(settings));

      // Also update global settings as a fallback/cache for initial load
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }
  }, [selectedCreditCalendarId, selectedDebitCalendarId, startBalance, timespan, autoRun, weekStartDay, viewMode, userProfile, settingsLoaded]);

  const fetchCalendars = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error?.message || response.statusText,
          status: response.status
        };
      }

      const data = await response.json();
      setCalendars(data.items || []);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Error fetching calendars:", err);
      setError(`Failed to fetch calendars: ${err.message}`);
      if (err.status === 401) handleLogout();
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, handleLogout]);

  const createCalendar = async (summary: string) => {
    if (!accessToken) return null;
    try {
      setIsLoading(true);
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ summary })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error?.message || response.statusText,
          status: response.status
        };
      }

      const newCalendar = await response.json();
      await fetchCalendars(); // Refresh calendar list
      return newCalendar;
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Error creating calendar:", err);
      setError(`Failed to create calendar: ${err.message}`);
      if (err.status === 401) handleLogout();
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCalendar = async (type: 'credit' | 'debit') => {
    if (!hasWriteAccess) {
      const granted = await grantWriteAccess();
      if (!granted) return; // User denied or failed
    }

    const name = window.prompt("Enter new calendar name:");
    if (name) {
      const newCal = await createCalendar(name);
      if (newCal) {
        if (type === 'credit') setSelectedCreditCalendarId(newCal.id);
        else setSelectedDebitCalendarId(newCal.id);
      }
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchCalendars();
    }
  }, [fetchCalendars, accessToken]);

  const fetchEvents = useCallback(async (calendarId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> => {
    if (!accessToken) return [];
    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error?.message || response.statusText,
          status: response.status
        };
      }

      const data = await response.json();
      return data.items || [];
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(`Error fetching events for ${calendarId}:`, err);
      setError(`Failed to fetch events for calendar ${calendarId}: ${err.message}`);
      if (err.status === 401) handleLogout();
      return [];
    }
  }, [accessToken, handleLogout]);

  const runForecast = useCallback(async () => {
    if (!selectedCreditCalendarId || !selectedDebitCalendarId || !timespan || !startBalance) {
      if (!selectedCreditCalendarId || !selectedDebitCalendarId || !timespan || !startBalance) {
        setError("Please fill all fields: Start Balance, Timespan, Credit Calendar, and Debit Calendar.");
        return;
      }
    }

    if (!selectedCreditCalendarId || !selectedDebitCalendarId || !timespan || !startBalance) {
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

    let forecastEndDate = new Date(forecastStartDate);
    switch (timespan) {
      case '1M': forecastEndDate = addMonths(forecastStartDate, 1); break;
      case '3M': forecastEndDate = addMonths(forecastStartDate, 3); break;
      case '6M': forecastEndDate = addMonths(forecastStartDate, 6); break;
      case '1Y': forecastEndDate = addYears(forecastStartDate, 1); break;
      case '2Y': forecastEndDate = addYears(forecastStartDate, 2); break;
      default: forecastEndDate = addMonths(forecastStartDate, 1); break;
    }
    forecastEndDate = endOfDay(forecastEndDate);

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
  }, [selectedCreditCalendarId, selectedDebitCalendarId, timespan, startBalance, startFromTomorrow, fetchEvents]);

  useEffect(() => {
    if (autoRun) {
      const timer = setTimeout(() => {
        if (selectedCreditCalendarId && selectedDebitCalendarId && timespan && startBalance) {
          runForecast();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoRun, runForecast, selectedCreditCalendarId, selectedDebitCalendarId, timespan, startBalance]);


  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (key !== 'when') {
        if (current.key !== key) {
          return {
            key,
            direction: 'asc'
          }
        }

        if (current.direction === 'desc') {
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

  const filteredForecast = useMemo(() => {
    if (!searchQuery) return forecast;
    const lowerQuery = searchQuery.toLowerCase();
    return forecast.filter(item =>
      item.summary.toLowerCase().includes(lowerQuery) ||
      item.amount.toString().includes(lowerQuery) ||
      item.balance.toString().includes(lowerQuery) ||
      format(item.when, 'yyyy-MM-dd').includes(lowerQuery)
    );
  }, [forecast, searchQuery]);

  const sortedForecast = useMemo(() => {
    return [...filteredForecast].sort((a, b) => {
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
  }, [filteredForecast, sortConfig]);

  const negativeBalanceExists = sortedForecast.some(entry => entry.balance < 0);

  const scrollToNegativeBalance = () => {
    const firstNegative = sortedForecast.find(entry => entry.balance < 0);
    if (!firstNegative) return;

    if (viewMode === 'table') {
      const index = sortedForecast.indexOf(firstNegative);
      if (index !== -1) {
        document.getElementById(`row-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const dateId = `day-${format(firstNegative.when, 'yyyy-MM-dd')}`;
      document.getElementById(dateId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Fin Cal</h1>
        <div className="flex items-center gap-4">
          {userProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring rounded-md">
                  <img src={userProfile.picture} alt={userProfile.name} className="w-8 h-8 rounded-full" />
                  <span className="text-sm">{userProfile.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="grid sm:grid-cols-2 gap-4">
            <InputGroup className="flex justify-between">
              <InputGroupText>Starting Balance</InputGroupText>
              <InputGroupInput
                id="start-balance"
                type="number"
                className="text-right"
                placeholder="Enter starting balance"
                value={startBalance}
                onChange={(e) => setStartBalance(e.target.value)}
              />
            </InputGroup>

            <InputGroup className="flex justify-between">
              <InputGroupText>Forecast Duration</InputGroupText>
              <InputGroupAddon>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <InputGroupButton variant="ghost" className="font-normal">
                      {timespan === '1M' ? '1 Month' :
                        timespan === '3M' ? '3 Months' :
                          timespan === '6M' ? '6 Months' :
                            timespan === '1Y' ? '1 Year' :
                              timespan === '2Y' ? '2 Years' : timespan}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </InputGroupButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTimespan("1M")}>1 Month</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimespan("3M")}>3 Months</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimespan("6M")}>6 Months</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimespan("1Y")}>1 Year</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimespan("2Y")}>2 Years</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </InputGroupAddon>
            </InputGroup>

            <InputGroup className="flex justify-between">
              <InputGroupText>Income Calendar</InputGroupText>
              <InputGroupAddon>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <InputGroupButton variant="ghost" className="font-normal">
                      {calendars.find(c => c.id === selectedCreditCalendarId)?.summary || "--"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </InputGroupButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {calendars.map(calendar => (
                      <DropdownMenuItem key={calendar.id} onClick={() => setSelectedCreditCalendarId(calendar.id)}>
                        {calendar.summary}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleCreateCalendar('credit')}>
                      <Plus className="mr-2 h-4 w-4" /> Create new...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </InputGroupAddon>
            </InputGroup>

            <InputGroup className="flex justify-between">
              <InputGroupText>Expense Calendar</InputGroupText>
              <InputGroupAddon>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <InputGroupButton variant="ghost" className="font-normal">
                      {calendars.find(c => c.id === selectedDebitCalendarId)?.summary || "--"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </InputGroupButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {calendars.map(calendar => (
                      <DropdownMenuItem key={calendar.id} onClick={() => setSelectedDebitCalendarId(calendar.id)}>
                        {calendar.summary}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleCreateCalendar('debit')}>
                      <Plus className="mr-2 h-4 w-4" /> Create new...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </InputGroupAddon>
            </InputGroup>

            <InputGroup className="flex justify-between">
              <InputGroupText>Start of Week</InputGroupText>
              <InputGroupAddon>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <InputGroupButton variant="ghost" className="font-normal">
                      {weekStartDay === 0 ? 'Sunday' : 'Monday'}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </InputGroupButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setWeekStartDay(0)}>Sunday</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWeekStartDay(1)}>Monday</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="start-tomorrow"
                checked={startFromTomorrow}
                onCheckedChange={(checked) => setStartFromTomorrow(Boolean(checked))}
              />
              <Label htmlFor="start-tomorrow">Start Forecast from Tomorrow</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-run"
                checked={autoRun}
                onCheckedChange={(checked) => setAutoRun(Boolean(checked))}
              />
              <Label htmlFor="auto-run">Auto Run</Label>
            </div>
          </div>
          <div className="flex justify-between items-center w-full">
            <Button onClick={runForecast} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Forecast
                </>
              ) : (
                'Run Forecast'
              )}
            </Button>
            <div className="ml-4 flex gap-2">
              <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => handleAddTransaction()}>
                <Plus className="h-5 w-5" />
                <span className="sr-only">Add Transaction</span>
              </Button>
              <AddTransactionDialog
                selectedCreditCalendarId={selectedCreditCalendarId}
                selectedDebitCalendarId={selectedDebitCalendarId}
                accessToken={accessToken}
                onTransactionAdded={() => {
                  if (autoRun) runForecast();
                }}
                handleLogout={handleLogout}
                hasWriteAccess={hasWriteAccess}
                grantWriteAccess={grantWriteAccess}
                open={isAddTransactionOpen}
                onOpenChange={setIsAddTransactionOpen}
                defaultDate={addTransactionDefaults.date}
                defaultType={addTransactionDefaults.type}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <ButtonGroup>
          <Button
            variant="outline"
            size="sm"
            disabled={!negativeBalanceExists}
            onClick={() => scrollToNegativeBalance()}
          >
            Scroll to negative balance
          </Button>
        </ButtonGroup>
        <ButtonGroup>
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
          </Button></ButtonGroup>
      </div>

      <div className="flex items-center py-4">
        <InputGroup>
          <InputGroupInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">{filteredForecast.length} results</InputGroupAddon>
        </InputGroup>
      </div>


      {viewMode === 'table' ? (
        <ForecastTable
          sortedForecast={sortedForecast}
          handleSort={handleSort}
          sortConfig={sortConfig}
          onAddTransaction={handleAddTransaction}
        />
      ) : (
        <ForecastCalendar
          forecast={filteredForecast}
          weekStartDay={weekStartDay}
          startDate={sortedForecast.length > 0 ? sortedForecast[0].when : new Date()}
          endDate={(() => {
            const start = startFromTomorrow ? startOfDay(addDays(new Date(), 1)) : startOfDay(new Date());
            switch (timespan) {
              case '1M': return addMonths(start, 1);
              case '3M': return addMonths(start, 3);
              case '6M': return addMonths(start, 6);
              case '1Y': return addYears(start, 1);
              case '2Y': return addYears(start, 2);
              default: return addMonths(start, 1);
            }
          })()}
          onAddTransaction={handleAddTransaction}
        />
      )}
    </div>
  );
}
