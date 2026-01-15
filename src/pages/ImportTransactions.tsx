import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, ChevronDown, Plus } from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '@/App';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createBatchBody } from '@/lib/googleBatch';
import type { Calendar } from '../types/calendar';

// Types
interface PlaidStream {
  stream_id: string;
  category: string[];
  description: string;
  merchant_name: string;
  first_date: string;
  last_date: string;
  frequency: string; // "WEEKLY", "BIWEEKLY", "SEMI_MONTHLY", "MONTHLY", "YEARLY"
  transaction_ids: string[];
  average_amount: {
    amount: number;
    currency_code: string;
  };
  is_active: boolean;
  status: "MATURE" | "EARLY_DETECTION" | "UNKNOWN";
  account_id: string;
}

interface GroupedTransactions {
  [accountId: string]: {
    streams: PlaidStream[];
    selectedCalendarId?: string; // ID of the Google Calendar to import to
  }
}

export function ImportTransactions() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'connect' | 'review' | 'success'>('connect');

  // Data
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions>({});
  // In a real app we'd fetch accounts info too to get names, for now we might use account IDs
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  // New Calendar Dialog
  const [isNewCalendarDialogOpen, setIsNewCalendarDialogOpen] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [accountToAssignNewCalendar, setAccountToAssignNewCalendar] = useState<string | null>(null);

  // 1. Fetch Link Token & Calendars on Mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Fetch Link Token
        const tokenRes = await fetch('/api/create_link_token', { method: 'POST' });
        if (!tokenRes.ok) throw new Error('Failed to create link token');
        const tokenData = await tokenRes.json();
        setLinkToken(tokenData.link_token);

        // Fetch Calendars
        if (accessToken) {
            const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (calRes.ok) {
                const calData = await calRes.json();
                setCalendars(calData.items || []);
            }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to initialize. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [accessToken]);

  const onSuccess = useCallback(async (public_token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 2. Exchange Public Token
      const exchangeResponse = await fetch('/api/exchange_public_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      });

      if (!exchangeResponse.ok) throw new Error('Failed to exchange token');
      const { access_token } = await exchangeResponse.json();

      // 3. Fetch Recurring Transactions
      const transactionsResponse = await fetch('/api/get_recurring_transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token }),
      });

      if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions');
      const data = await transactionsResponse.json();

      // Group by account_id
      const groups: GroupedTransactions = {};
      const streams = (data.inflow_streams || []).concat(data.outflow_streams || []);

      streams.forEach((stream: PlaidStream) => {
          if (!groups[stream.account_id]) {
              groups[stream.account_id] = { streams: [], selectedCalendarId: undefined };
          }
          groups[stream.account_id].streams.push(stream);
      });

      setGroupedTransactions(groups);
      setStep('review');

    } catch (err) {
      console.error(err);
      setError('An error occurred while connecting to your bank.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCalendar = async (summary: string) => {
      try {
          const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ summary })
          });
          if (!response.ok) throw new Error("Failed to create calendar");
          const newCal = await response.json();
          setCalendars(prev => [...prev, newCal]);
          return newCal.id;
      } catch (err) {
          console.error(err);
          setError("Failed to create new calendar");
          return null;
      }
  };

  const handleCreateCalendar = async () => {
      if (!newCalendarName || !accountToAssignNewCalendar) return;
      const newId = await createCalendar(newCalendarName);
      if (newId) {
          setGroupedTransactions(prev => ({
              ...prev,
              [accountToAssignNewCalendar]: {
                  ...prev[accountToAssignNewCalendar],
                  selectedCalendarId: newId
              }
          }));
          setIsNewCalendarDialogOpen(false);
          setNewCalendarName("");
          setAccountToAssignNewCalendar(null);
      }
  };

  const mapPlaidFrequencyToRRule = (freq: string): string => {
      switch (freq) {
          case 'WEEKLY': return 'RRULE:FREQ=WEEKLY';
          case 'BIWEEKLY': return 'RRULE:FREQ=WEEKLY;INTERVAL=2';
          case 'SEMI_MONTHLY': return 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15'; // Approximation
          case 'MONTHLY': return 'RRULE:FREQ=MONTHLY';
          case 'YEARLY': return 'RRULE:FREQ=YEARLY';
          default: return 'RRULE:FREQ=MONTHLY';
      }
  };

  const handleImport = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const allStreamsToImport: { stream: PlaidStream; calendarId: string }[] = [];

          Object.values(groupedTransactions).forEach(group => {
              if (group.selectedCalendarId) {
                  group.streams.forEach(stream => {
                      allStreamsToImport.push({ stream, calendarId: group.selectedCalendarId! });
                  });
              }
          });

          if (allStreamsToImport.length > 0) {
              const CHUNK_SIZE = 50;
              for (let i = 0; i < allStreamsToImport.length; i += CHUNK_SIZE) {
                  const chunk = allStreamsToImport.slice(i, i + CHUNK_SIZE);

                  const batchRequests = chunk.map((item, idx) => {
                      const stream = item.stream;
                      const amount = Math.abs(stream.average_amount.amount);
                      const description = stream.description || stream.merchant_name || "Unknown Transaction";
                      const title = `$${amount} ${description}`;

                      return {
                          method: 'POST',
                          url: `/calendar/v3/calendars/${item.calendarId}/events`,
                          body: {
                              summary: title,
                              start: { date: stream.last_date },
                              end: { date: stream.last_date },
                              recurrence: [mapPlaidFrequencyToRRule(stream.frequency)],
                              transparency: "transparent"
                          },
                          contentId: `${i + idx}`
                      };
                  });

                  const { body, boundary } = createBatchBody(batchRequests);

                  const response = await fetch('https://www.googleapis.com/batch/calendar/v3', {
                      method: 'POST',
                      headers: {
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': `multipart/mixed; boundary=${boundary}`
                      },
                      body: body
                  });

                  if (!response.ok) {
                      throw new Error(`Batch request failed: ${response.statusText}`);
                  }
              }
          }

          setStep('success');
      } catch (err) {
          console.error(err);
          setError("Failed to import events to Google Calendar.");
      } finally {
          setIsLoading(false);
      }
  };

  const config = { token: linkToken, onSuccess };
  const { open, ready } = usePlaidLink(config);

  if (step === 'success') {
      return (
        <div className="container mx-auto p-4 flex flex-col items-center justify-center space-y-6 pt-20">
             <div className="bg-green-100 p-4 rounded-full">
                 <Check className="w-12 h-12 text-green-600" />
             </div>
             <h2 className="text-2xl font-bold">Import Successful!</h2>
             <p className="text-muted-foreground text-center max-w-md">
                 Your recurring transactions have been added to your Google Calendar(s).
             </p>
             <Button onClick={() => navigate('/app')}>Return to Dashboard</Button>
        </div>
      );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Import Recurring Transactions</h1>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {step === 'connect' && (
        !linkToken ? (
            <div className="flex justify-center p-8">
               {isLoading ? <Loader2 className="animate-spin" /> : <p>Initializing...</p>}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Connect your Bank</CardTitle>
                <CardDescription>
                  Securely connect your bank account to detect recurring subscriptions and income.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => open()} disabled={!ready || isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Connect with Plaid
                </Button>
              </CardContent>
            </Card>
          )
      )}

      {step === 'review' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Review & Select Calendars</h2>
              </div>

              {Object.keys(groupedTransactions).length === 0 ? (
                  <p className="text-muted-foreground">No recurring transactions found.</p>
              ) : (
                  Object.entries(groupedTransactions).map(([accountId, group]) => (
                      <Card key={accountId}>
                          <CardHeader className="pb-3">
                              <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                                  <div>
                                      <CardTitle className="text-base">Account: {accountId}</CardTitle>
                                      <CardDescription>{group.streams.length} recurring items found</CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2 w-full md:w-auto">
                                      <Label className="whitespace-nowrap">Import to:</Label>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" className="w-[200px] justify-between">
                                            {group.selectedCalendarId
                                                ? calendars.find(c => c.id === group.selectedCalendarId)?.summary
                                                : "Select Calendar..."}
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[200px]">
                                            <DropdownMenuItem onSelect={() => {
                                                setAccountToAssignNewCalendar(accountId);
                                                setIsNewCalendarDialogOpen(true);
                                            }}>
                                                <Plus className="mr-2 h-4 w-4" /> Create New Calendar
                                            </DropdownMenuItem>
                                            {calendars.map(cal => (
                                                <DropdownMenuItem key={cal.id} onSelect={() => {
                                                    setGroupedTransactions(prev => ({
                                                        ...prev,
                                                        [accountId]: { ...prev[accountId], selectedCalendarId: cal.id }
                                                    }));
                                                }}>
                                                    {cal.summary}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                  </div>
                              </div>
                          </CardHeader>
                          <CardContent>
                              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                  <div className="space-y-2">
                                      {group.streams.map((stream, idx) => (
                                          <div key={idx} className="flex justify-between items-center text-sm">
                                              <span>{stream.description || stream.merchant_name}</span>
                                              <div className="flex items-center gap-4 text-muted-foreground">
                                                  <span className="capitalize">{stream.frequency.toLowerCase().replace('_', ' ')}</span>
                                                  <span className="font-medium text-foreground">${Math.abs(stream.average_amount.amount).toFixed(2)}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </ScrollArea>
                          </CardContent>
                      </Card>
                  ))
              )}

              <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep('connect')}>Back</Button>
                  <Button
                    onClick={handleImport}
                    disabled={isLoading || !Object.values(groupedTransactions).some(g => !!g.selectedCalendarId)}
                  >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Import Selected
                  </Button>
              </div>
          </div>
      )}

      <Dialog open={isNewCalendarDialogOpen} onOpenChange={setIsNewCalendarDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Create New Calendar</DialogTitle>
                  <DialogDescription>Enter a name for the new Google Calendar.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="cal-name">Calendar Name</Label>
                  <Input
                    id="cal-name"
                    value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder="e.g. Bank Subscriptions"
                  />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewCalendarDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateCalendar} disabled={!newCalendarName}>Create</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
