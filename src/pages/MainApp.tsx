import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay, addDays } from 'date-fns';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  LayoutGrid,
  Loader2,
  LogOut,
  Search,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ForecastTable, type SortDirection, type SortKey } from '@/components/ForecastTable';
import { ForecastCalendar, type WarningStyle } from '@/components/ForecastCalendar';
import { ModeToggle } from '@/components/ui/mode-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { ButtonGroup } from '@/components/ui/button-group';
import type { Calendar, CalendarEvent, ForecastEntry, UserProfile } from '@/types/calendar';
import type {
  ImportColumnMapping,
  ImportIssue,
  ImportPreview,
  NormalizedTransaction,
  RecurringCadence,
  RecurringRule,
} from '@/types/forecast';
import { trackEvent } from '@/lib/analytics';
import { defaultForecastEndDate, daysUntilNegative, detectRecurringRules, forecastPointsToEntries, generateForecast, googleEventsToTransactions, lowestBalance, ruleToGoogleEvent } from '@/lib/forecast';
import { detectImportMapping, normalizeImportedTransactions, parseImportFile } from '@/lib/import';

const STORAGE_KEY = 'fincal_session_v2';

interface StoredSession {
  currentBalance: string;
  timespan: string;
  weekStartDay: 0 | 1;
  warningAmount: number;
  warningColor: string;
  warningOperator: '<' | '<=';
  warningStyle: WarningStyle;
  importedTransactions: NormalizedTransaction[];
  recurringRules: RecurringRule[];
  oneOffTransactions: NormalizedTransaction[];
  mapping?: ImportColumnMapping;
  preview?: ImportPreview | null;
  selectedCreditCalendarId?: string;
  selectedDebitCalendarId?: string;
}

interface MainAppProps {
  userProfile: UserProfile | null;
  accessToken: string | null;
  handleLogout: () => void;
  hasWriteAccess: boolean;
  grantWriteAccess: () => Promise<boolean>;
  login: () => void;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch (error) {
    console.warn('Failed to load session', error);
    return null;
  }
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.65) return 'Medium';
  return 'Low';
}

function cadenceOptions(): RecurringCadence[] {
  return ['weekly', 'biweekly', 'semimonthly', 'monthly', 'yearly', 'custom'];
}

function mappingValue(mapping: ImportColumnMapping, key: keyof ImportColumnMapping) {
  return mapping[key] ?? '';
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function cadenceLabel(cadence: RecurringCadence) {
  switch (cadence) {
    case 'biweekly':
      return 'Biweekly';
    case 'semimonthly':
      return 'Semi-monthly';
    default:
      return cadence.charAt(0).toUpperCase() + cadence.slice(1);
  }
}

export function MainApp({
  userProfile,
  accessToken,
  handleLogout,
  hasWriteAccess,
  grantWriteAccess,
  login,
}: MainAppProps) {
  const session = loadSession();

  const [currentBalance, setCurrentBalance] = useState(session?.currentBalance ?? '4000');
  const [timespan, setTimespan] = useState(session?.timespan ?? '90D');
  const [weekStartDay, setWeekStartDay] = useState<0 | 1>(session?.weekStartDay ?? 0);
  const [warningAmount, setWarningAmount] = useState<number>(session?.warningAmount ?? 0);
  const [warningColor, setWarningColor] = useState<string>(session?.warningColor ?? '#b45309');
  const [warningOperator, setWarningOperator] = useState<'<' | '<='>(session?.warningOperator ?? '<');
  const [warningStyle, setWarningStyle] = useState<WarningStyle>(session?.warningStyle ?? 'Balance Color');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: null, direction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [preview, setPreview] = useState<ImportPreview | null>(session?.preview ?? null);
  const [mapping, setMapping] = useState<ImportColumnMapping | null>(session?.mapping ?? null);
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [importedTransactions, setImportedTransactions] = useState<NormalizedTransaction[]>(session?.importedTransactions ?? []);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(session?.recurringRules ?? []);
  const [oneOffTransactions, setOneOffTransactions] = useState<NormalizedTransaction[]>(session?.oneOffTransactions ?? []);
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);

  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCreditCalendarId, setSelectedCreditCalendarId] = useState<string | undefined>(session?.selectedCreditCalendarId);
  const [selectedDebitCalendarId, setSelectedDebitCalendarId] = useState<string | undefined>(session?.selectedDebitCalendarId);

  useEffect(() => {
    trackEvent('return_usage', { signedIn: Boolean(accessToken) });
  }, [accessToken]);

  const persistSession = useCallback(() => {
    const payload: StoredSession = {
      currentBalance,
      timespan,
      weekStartDay,
      warningAmount,
      warningColor,
      warningOperator,
      warningStyle,
      importedTransactions,
      recurringRules,
      oneOffTransactions,
      mapping: mapping ?? undefined,
      preview,
      selectedCreditCalendarId,
      selectedDebitCalendarId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    currentBalance,
    timespan,
    weekStartDay,
    warningAmount,
    warningColor,
    warningOperator,
    warningStyle,
    importedTransactions,
    recurringRules,
    oneOffTransactions,
    mapping,
    preview,
    selectedCreditCalendarId,
    selectedDebitCalendarId,
  ]);

  useEffect(() => {
    persistSession();
  }, [persistSession]);

  const forecastStartDate = useMemo(() => format(startOfDay(addDays(new Date(), 1)), 'yyyy-MM-dd'), []);
  const forecastEndDate = useMemo(
    () => format(defaultForecastEndDate(startOfDay(addDays(new Date(), 1)), timespan), 'yyyy-MM-dd'),
    [timespan],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const fetchCalendars = async () => {
      try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch calendars');
        }
        const data = await response.json();
        setCalendars(data.items ?? []);
      } catch (fetchError) {
        console.error(fetchError);
      }
    };

    fetchCalendars();
  }, [accessToken]);

  const importFromFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    trackEvent('upload_started', { fileName: file.name, size: file.size });
    try {
      const nextPreview = await parseImportFile(file);
      const nextMapping = detectImportMapping(nextPreview.headers);
      setPreview(nextPreview);
      setMapping(nextMapping);
      setImportIssues([]);
      setSuccessMessage(`Loaded ${nextPreview.rows.length} rows from ${file.name}. Review the mapping and finish import.`);
    } catch (importError) {
      console.error(importError);
      setError(importError instanceof Error ? importError.message : 'Failed to read file.');
      trackEvent('upload_failed');
    } finally {
      setIsLoading(false);
    }
  };

  const completeImport = () => {
    if (!preview || !mapping) {
      setError('Upload a CSV or XLSX file before importing.');
      return;
    }

    const { transactions, issues } = normalizeImportedTransactions(preview.rows, mapping, preview.source);
    setImportIssues(issues);

    if (transactions.length === 0) {
      setError('No valid transactions were found after normalization.');
      return;
    }

    const nextRules = detectRecurringRules(transactions);
    setImportedTransactions(transactions);
    setRecurringRules(nextRules);
    setError(null);
    setSuccessMessage(`Imported ${transactions.length} transactions and detected ${nextRules.length} recurring rules.`);
    trackEvent('upload_completed', { transactions: transactions.length, rules: nextRules.length });
  };

  const resetImportDraft = () => {
    setPreview(null);
    setMapping(null);
    setImportIssues([]);
    setSuccessMessage('Cleared the current import draft.');
  };

  const generateLocalForecast = () => {
    const parsedBalance = Number.parseFloat(currentBalance);
    if (!Number.isFinite(parsedBalance)) {
      setError('Current balance must be a valid number.');
      return;
    }

    const points = generateForecast({
      currentBalance: parsedBalance,
      recurringRules,
      oneOffTransactions,
      startDate: forecastStartDate,
      endDate: forecastEndDate,
    });

    const entries = forecastPointsToEntries(points, forecastStartDate, parsedBalance);
    setForecast(entries);
    setError(null);
    setSuccessMessage(`Forecast generated through ${forecastEndDate}.`);
    trackEvent('forecast_generated', {
      recurringRules: recurringRules.filter((rule) => rule.enabled).length,
      oneOffTransactions: oneOffTransactions.length,
    });
  };

  const addManualAdjustment = () => {
    const amount = Number.parseFloat(manualAmount);
    if (!manualDescription || !manualDate || !Number.isFinite(amount) || amount === 0) {
      setError('Enter a description, date, and non-zero amount for the manual adjustment.');
      return;
    }

    const nextTransaction: NormalizedTransaction = {
      id: `manual-${manualDate}-${manualDescription}-${Date.now()}`,
      source: 'manual',
      date: manualDate,
      description: manualDescription,
      amount,
    };

    setOneOffTransactions((current) => [...current, nextTransaction].sort((a, b) => a.date.localeCompare(b.date)));
    setManualDescription('');
    setManualAmount('');
    setSuccessMessage(`Added planned adjustment: ${nextTransaction.description}.`);
  };

  const fetchEvents = useCallback(async (calendarId: string): Promise<CalendarEvent[]> => {
    if (!accessToken) return [];
    const params = new URLSearchParams({
      timeMin: new Date('2025-01-01').toISOString(),
      timeMax: new Date().toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to load Google Calendar events.');
    }
    const data = await response.json();
    return data.items ?? [];
  }, [accessToken]);

  const importFromGoogleCalendars = async () => {
    if (!accessToken || !selectedCreditCalendarId || !selectedDebitCalendarId) {
      setError('Connect Google and choose both an income and expense calendar first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [creditEvents, debitEvents] = await Promise.all([
        fetchEvents(selectedCreditCalendarId),
        fetchEvents(selectedDebitCalendarId),
      ]);

      const transactions = [
        ...googleEventsToTransactions(creditEvents, 'credit'),
        ...googleEventsToTransactions(debitEvents, 'debit'),
      ].sort((a, b) => a.date.localeCompare(b.date));

      const rules = detectRecurringRules(transactions);
      setImportedTransactions(transactions);
      setRecurringRules(rules);
      setSuccessMessage(`Loaded ${transactions.length} historical transactions from Google Calendar.`);
      trackEvent('google_import_completed', { transactions: transactions.length, rules: rules.length });
    } catch (googleError) {
      console.error(googleError);
      setError(googleError instanceof Error ? googleError.message : 'Failed to import from Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportRecurringRules = async () => {
    if (!accessToken) {
      login();
      return;
    }
    if (!hasWriteAccess) {
      const granted = await grantWriteAccess();
      if (!granted) {
        return;
      }
    }
    if (!selectedCreditCalendarId || !selectedDebitCalendarId) {
      setError('Select export calendars for both income and expenses before exporting.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const enabledRules = recurringRules.filter((rule) => rule.enabled);
      for (const rule of enabledRules) {
        const calendarId = rule.direction === 'credit' ? selectedCreditCalendarId : selectedDebitCalendarId;
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(ruleToGoogleEvent(rule)),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to export ${rule.label}.`);
        }
      }

      setSuccessMessage(`Exported ${recurringRules.filter((rule) => rule.enabled).length} recurring rules to Google Calendar.`);
      trackEvent('google_export_completed', { rules: recurringRules.filter((rule) => rule.enabled).length });
    } catch (exportError) {
      console.error(exportError);
      setError(exportError instanceof Error ? exportError.message : 'Google export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const filteredForecast = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return forecast.filter((entry) => {
      if (!lowerQuery) return true;
      return (
        entry.summary.toLowerCase().includes(lowerQuery) ||
        entry.amount.toString().includes(lowerQuery) ||
        entry.balance.toString().includes(lowerQuery) ||
        format(entry.when, 'yyyy-MM-dd').includes(lowerQuery)
      );
    });
  }, [forecast, searchQuery]);

  const sortedForecast = useMemo(() => {
    return [...filteredForecast].sort((a, b) => {
      if (!sortConfig.key) {
        return a.when.getTime() - b.when.getTime();
      }
      const direction = sortConfig.direction === 'desc' ? -1 : 1;
      switch (sortConfig.key) {
        case 'balance':
          return (a.balance - b.balance) * direction;
        case 'amount':
          return (((a.type === 'debit' ? -1 : 1) * a.amount) - ((b.type === 'debit' ? -1 : 1) * b.amount)) * direction;
        case 'summary':
          return a.summary.localeCompare(b.summary) * direction;
        case 'when':
          return (a.when.getTime() - b.when.getTime()) * direction;
        default:
          return 0;
      }
    });
  }, [filteredForecast, sortConfig]);

  const lowestPoint = forecast.length > 0 ? lowestBalance(forecast) : null;
  const negativeCountdown = forecast.length > 0 ? daysUntilNegative(forecast) : null;

  const updateRule = (ruleId: string, patch: Partial<RecurringRule>) => {
    trackEvent('recurring_rule_confirmed', { ruleId, patchKeys: Object.keys(patch) });
    setRecurringRules((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    );
  };

  const enabledRuleCount = recurringRules.filter((rule) => rule.enabled).length;
  const totalEnabledRecurring = recurringRules
    .filter((rule) => rule.enabled)
    .reduce((sum, rule) => sum + (rule.direction === 'credit' ? rule.amount : -rule.amount), 0);
  const oneOffNetTotal = oneOffTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <div className="rounded-[2rem] border border-white/50 bg-background/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="border-b border-border/60 px-5 py-4 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">FinCal</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Forecast your next cash crunch before it happens</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                  Import CSV or Excel, let FinCal surface recurring paychecks and bills, then turn that history into a forward-looking balance view.
                </p>
              </div>
              <div className="flex items-center gap-3">
            {userProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-sm">
                    <img src={userProfile.picture} alt={userProfile.name} className="h-8 w-8 rounded-full" />
                    <span className="text-sm">{userProfile.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{userProfile.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" onClick={login}>Connect Google</Button>
            )}
            <ModeToggle />
              </div>
            </div>
          </div>
          <div className="space-y-6 px-5 py-5 md:px-8 md:py-8">
            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-[1.75rem] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(34,197,94,0.02))] p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full bg-emerald-600 px-3 py-1 font-medium text-white">Import-first workflow</span>
                  <span className="rounded-full border border-emerald-700/15 bg-white/70 px-3 py-1 text-emerald-900 dark:bg-card/40 dark:text-emerald-100">No bank connection required</span>
                  <span className="rounded-full border border-emerald-700/15 bg-white/70 px-3 py-1 text-emerald-900 dark:bg-card/40 dark:text-emerald-100">Google stays optional</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-card/60">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Step 1</p>
                    <h2 className="mt-2 text-xl font-semibold">Import history</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Upload a transaction export and map the columns once.</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-card/60">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Step 2</p>
                    <h2 className="mt-2 text-xl font-semibold">Tune recurring rules</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Keep the likely paychecks and bills. Disable the noisy ones.</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-card/60">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Step 3</p>
                    <h2 className="mt-2 text-xl font-semibold">See the forecast</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Look for low points, negative days, and timing gaps.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Session Snapshot</p>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-baseline justify-between rounded-2xl bg-muted/50 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Imported history</span>
                    <span className="text-3xl font-semibold">{importedTransactions.length}</span>
                  </div>
                  <div className="flex items-baseline justify-between rounded-2xl bg-muted/50 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Lowest projected balance</span>
                    <span className="text-xl font-semibold">{lowestPoint ? `$${lowestPoint.balance.toFixed(2)}` : 'Run forecast'}</span>
                  </div>
                  <div className="flex items-baseline justify-between rounded-2xl bg-muted/50 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Days until negative</span>
                    <span className="text-xl font-semibold">{negativeCountdown === null ? 'Safe' : `${negativeCountdown} days`}</span>
                  </div>
                  <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    Session state lives in this browser. You can connect Google later for export or pull from your existing calendars.
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.28fr_0.72fr]">
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">1</span>
                Import
              </div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Upload className="h-5 w-5" />
                Import Transactions
              </CardTitle>
              <CardDescription>Upload CSV or XLSX, review the detected column mapping, and promote good history into a usable forecast model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
                <div className="space-y-4 rounded-[1.5rem] border border-dashed p-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-muted/40 px-4 py-12 text-center transition-colors hover:bg-muted/60">
                    <FileSpreadsheet className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
                    <div>
                      <p className="font-medium">Drop in CSV or Excel</p>
                      <p className="text-sm text-muted-foreground">Supports `.csv`, `.xlsx`, and `.xls`. Files stay in this browser session and never hit a FinCal backend.</p>
                    </div>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void importFromFile(file);
                        }
                      }}
                    />
                  </label>

                  <div className="space-y-3 rounded-[1.25rem] bg-muted/35 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Import progress</span>
                      <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        {preview ? 'Draft ready' : 'Waiting for file'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Upload a transaction export', done: Boolean(preview) },
                        { label: 'Confirm the column mapping', done: Boolean(preview && mapping?.dateColumn && mapping?.descriptionColumn && (mapping?.amountColumn || mapping?.creditColumn || mapping?.debitColumn)) },
                        { label: 'Import and detect recurring rules', done: importedTransactions.length > 0 },
                      ].map((item, index) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-xl bg-background/80 px-3 py-2 text-sm shadow-sm">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            item.done ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {item.done ? '✓' : index + 1}
                          </span>
                          <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {preview && (
                      <Button variant="outline" className="w-full rounded-full" onClick={resetImportDraft}>
                        Clear Import Draft
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-muted/35 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Rows loaded</p>
                      <p className="mt-2 text-2xl font-semibold">{preview?.rows.length ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/35 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Headers found</p>
                      <p className="mt-2 text-2xl font-semibold">{preview?.headers.length ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/35 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Import source</p>
                      <p className="mt-2 text-2xl font-semibold">{preview?.source?.toUpperCase() ?? 'FILE'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                    Best results come from exports with a clear `date`, `description`, and either one signed `amount` column or separate `credit` / `debit` columns.
                  </div>
                </div>
              </div>

              {preview && mapping && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Mapping draft</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        FinCal guessed the mapping below. Check the core fields before promoting this history into recurring rules.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${mapping.dateColumn ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'}`}>Date</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${mapping.descriptionColumn ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'}`}>Description</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${(mapping.amountColumn || mapping.creditColumn || mapping.debitColumn) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'}`}>Amounts</span>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      ['Date column', 'dateColumn'],
                      ['Description column', 'descriptionColumn'],
                      ['Signed amount', 'amountColumn'],
                      ['Debit column', 'debitColumn'],
                      ['Credit column', 'creditColumn'],
                      ['Account column', 'accountColumn'],
                      ['Category column', 'categoryColumn'],
                    ].map(([label, key]) => (
                      <label key={key} className="space-y-2 text-sm">
                        <span className="font-medium">{label}</span>
                        <select
                          value={mappingValue(mapping, key as keyof ImportColumnMapping)}
                          onChange={(event) =>
                            setMapping((current) => current ? { ...current, [key]: event.target.value || undefined } : current)
                          }
                          className="w-full rounded-md border bg-background px-3 py-2"
                        >
                          <option value="">Not used</option>
                          {preview.headers.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">Ready to create recurring candidates?</p>
                      <p className="text-sm text-muted-foreground">
                        FinCal will normalize {preview.rows.length} rows, flag invalid lines, and surface likely repeating transactions.
                      </p>
                    </div>
                    <Button onClick={completeImport} className="rounded-full px-6">Import And Detect Recurring Rules</Button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border">
                    <div className="grid grid-cols-4 gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Date</span>
                      <span>Description</span>
                      <span>Amount</span>
                      <span>Account</span>
                    </div>
                    <div className="max-h-64 overflow-auto divide-y">
                      {preview.rows.slice(0, 8).map((row, index) => (
                        <div key={`${index}-${row[mapping.descriptionColumn ?? ''] ?? index}`} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
                          <span>{mapping.dateColumn ? row[mapping.dateColumn] : ''}</span>
                          <span className="truncate">{mapping.descriptionColumn ? row[mapping.descriptionColumn] : ''}</span>
                          <span>{mapping.amountColumn ? row[mapping.amountColumn] : mapping.creditColumn ? `${row[mapping.creditColumn] ?? ''} / ${row[mapping.debitColumn ?? ''] ?? ''}` : ''}</span>
                          <span className="truncate">{mapping.accountColumn ? row[mapping.accountColumn] : 'n/a'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {importIssues.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 font-medium text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    Import issues
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-amber-800">
                    {importIssues.slice(0, 8).map((issue) => (
                      <p key={`${issue.rowNumber}-${issue.message}`}>Row {issue.rowNumber}: {issue.message}</p>
                    ))}
                    {importIssues.length > 8 && <p>+{importIssues.length - 8} more rows need attention.</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">2</span>
                  Tune
                </div>
                <CardTitle className="text-2xl">Forecast Controls</CardTitle>
                <CardDescription>Set your balance, horizon, and warning rules. Session data stays in local storage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Forecast starts</p>
                    <p className="mt-2 text-lg font-semibold">{forecastStartDate}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Forecast ends</p>
                    <p className="mt-2 text-lg font-semibold">{forecastEndDate}</p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-muted/15 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Balance baseline</p>
                  <div className="mt-3">
                    <InputGroup>
                      <InputGroupText>Current Balance</InputGroupText>
                      <InputGroupInput type="number" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} />
                    </InputGroup>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 rounded-[1.25rem] border border-border/70 bg-muted/15 p-4 text-sm">
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Forecast horizon</span>
                    <select value={timespan} onChange={(event) => setTimespan(event.target.value)} className="w-full rounded-xl border bg-background px-3 py-2">
                      <option value="30D">30 days</option>
                      <option value="60D">60 days</option>
                      <option value="90D">90 days</option>
                      <option value="180D">180 days</option>
                      <option value="1Y">1 year</option>
                    </select>
                  </label>
                  <label className="space-y-2 rounded-[1.25rem] border border-border/70 bg-muted/15 p-4 text-sm">
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Week starts on</span>
                    <select value={weekStartDay} onChange={(event) => setWeekStartDay(Number(event.target.value) as 0 | 1)} className="w-full rounded-xl border bg-background px-3 py-2">
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-muted/15 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Warning behavior</p>
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: warningColor }} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Warning amount</span>
                      <input className="w-full rounded-xl border bg-background px-3 py-2" type="number" value={warningAmount} onChange={(event) => setWarningAmount(Number.parseFloat(event.target.value) || 0)} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Warning color</span>
                      <input className="h-10 w-full rounded-xl border bg-background px-2 py-1" type="color" value={warningColor} onChange={(event) => setWarningColor(event.target.value)} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Warning condition</span>
                      <select value={warningOperator} onChange={(event) => setWarningOperator(event.target.value as '<' | '<=')} className="w-full rounded-xl border bg-background px-3 py-2">
                        <option value="<">Balance below threshold</option>
                        <option value="<=">Balance at or below threshold</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Highlight style</span>
                      <select value={warningStyle} onChange={(event) => setWarningStyle(event.target.value as WarningStyle)} className="w-full rounded-xl border bg-background px-3 py-2">
                        <option value="Row Background">Row Background</option>
                        <option value="Text Color">Text Color</option>
                        <option value="Balance Color">Balance Color</option>
                      </select>
                    </label>
                  </div>
                </div>

                <Button className="w-full rounded-full py-6 text-base" onClick={generateLocalForecast} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Forecast
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <CardTitle>Manual Adjustments</CardTitle>
                    <CardDescription>Add one-off future cash events that should affect the forecast.</CardDescription>
                  </div>
                  <div className="rounded-full bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {oneOffTransactions.length} item{oneOffTransactions.length === 1 ? '' : 's'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Net adjustments</p>
                    <p className="mt-2 text-xl font-semibold">{formatCurrency(oneOffNetTotal)}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Latest planned date</p>
                    <p className="mt-2 text-xl font-semibold">{oneOffTransactions.at(-1)?.date ?? 'None yet'}</p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-muted/15 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Create a one-off adjustment</p>
                  <div className="mt-4 space-y-3">
                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder="Description" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="w-full rounded-xl border bg-background px-3 py-2" type="number" step="0.01" value={manualAmount} onChange={(event) => setManualAmount(event.target.value)} placeholder="Positive income or negative expense" />
                      <input className="w-full rounded-xl border bg-background px-3 py-2" type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} />
                    </div>
                    <Button variant="outline" className="w-full rounded-full" onClick={addManualAdjustment}>Add Planned Adjustment</Button>
                  </div>
                </div>

                {oneOffTransactions.length > 0 && (
                  <div className="space-y-2 rounded-2xl border p-3">
                    {oneOffTransactions.slice(-5).reverse().map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-muted-foreground">{transaction.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={transaction.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOneOffTransactions((current) => current.filter((item) => item.id !== transaction.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Optional Google Integration</CardTitle>
                <CardDescription>Use Google Calendar as a legacy source or export your confirmed recurring rules back out.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accessToken ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-muted/35 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Connected account</p>
                        <p className="mt-2 truncate text-sm font-semibold">{userProfile?.email ?? 'Google connected'}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/35 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Export readiness</p>
                        <p className="mt-2 text-sm font-semibold">{selectedCreditCalendarId && selectedDebitCalendarId ? 'Calendars selected' : 'Choose calendars below'}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 rounded-[1.25rem] border border-border/70 bg-muted/15 p-4 text-sm">
                        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Income calendar</span>
                        <select className="w-full rounded-xl border bg-background px-3 py-2" value={selectedCreditCalendarId ?? ''} onChange={(event) => setSelectedCreditCalendarId(event.target.value || undefined)}>
                          <option value="">Select calendar</option>
                          {calendars.map((calendar) => (
                            <option key={calendar.id} value={calendar.id}>{calendar.summary}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 rounded-[1.25rem] border border-border/70 bg-muted/15 p-4 text-sm">
                        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Expense calendar</span>
                        <select className="w-full rounded-xl border bg-background px-3 py-2" value={selectedDebitCalendarId ?? ''} onChange={(event) => setSelectedDebitCalendarId(event.target.value || undefined)}>
                          <option value="">Select calendar</option>
                          {calendars.map((calendar) => (
                            <option key={calendar.id} value={calendar.id}>{calendar.summary}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button variant="outline" className="rounded-full" onClick={importFromGoogleCalendars}>Load History From Google</Button>
                      <Button variant="outline" className="rounded-full" onClick={() => void exportRecurringRules()}>
                        Export Enabled Rules To Google
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed p-4 text-sm text-muted-foreground">
                    Connect Google only if you want to import from existing calendars or export confirmed recurring rules.
                    <Button className="mt-3 w-full rounded-full" variant="outline" onClick={login}>Connect Google</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">3</span>
                Confirm
              </div>
              <CardTitle className="text-2xl">Recurring Rules</CardTitle>
              <CardDescription>Review what FinCal thinks repeats. Disable noisy rules and adjust cadence or amount before forecasting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recurringRules.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Import transaction history first to detect recurring income and expenses.</div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr_auto]">
                    <div className="rounded-2xl bg-muted/35 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Enabled rules</p>
                      <p className="mt-2 text-2xl font-semibold">{enabledRuleCount} / {recurringRules.length}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/35 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Net recurring flow</p>
                      <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalEnabledRecurring)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" className="rounded-full" size="sm" onClick={() => setRecurringRules((current) => current.map((rule) => ({ ...rule, enabled: true })))}>
                        Enable all
                      </Button>
                      <Button variant="outline" className="rounded-full" size="sm" onClick={() => setRecurringRules((current) => current.map((rule) => ({ ...rule, enabled: false })))}>
                        Disable all
                      </Button>
                    </div>
                  </div>

                  {recurringRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`rounded-[1.4rem] border p-4 transition-colors ${
                        rule.enabled
                          ? 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(16,185,129,0.06),rgba(255,255,255,0))]'
                          : 'border-border/70 bg-muted/15 opacity-85'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 shadow-sm">
                              <input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })} />
                              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                {rule.enabled ? 'Included' : 'Ignored'}
                              </span>
                            </label>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
                              rule.direction === 'credit'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200'
                            }`}>
                              {rule.direction === 'credit' ? 'Income' : 'Expense'}
                            </span>
                            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                              {cadenceLabel(rule.cadence)}
                            </span>
                            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                              {confidenceLabel(rule.confidence)} confidence
                            </span>
                          </div>

                          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div className="min-w-0 flex-1">
                              <input
                                className="w-full rounded-xl border bg-background px-4 py-3 text-lg font-semibold shadow-sm"
                                value={rule.label}
                                onChange={(event) => updateRule(rule.id, { label: event.target.value })}
                              />
                              <p className="mt-2 text-sm text-muted-foreground">
                                Based on {rule.sourceTransactionIds.length} matching transactions. Anchor date starts at <span className="font-medium text-foreground">{rule.anchorDate}</span>.
                              </p>
                            </div>
                            <div className="rounded-2xl bg-background/80 px-4 py-3 text-right shadow-sm">
                              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Amount</p>
                              <p className={rule.direction === 'credit' ? 'mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300' : 'mt-2 text-2xl font-semibold text-red-700 dark:text-red-300'}>
                                {rule.direction === 'credit' ? '+' : '-'}{formatCurrency(rule.amount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm sm:grid-cols-3 lg:w-[420px]">
                          <label className="space-y-2 text-sm">
                            <span className="font-medium text-muted-foreground">Amount</span>
                            <input
                              className="w-full rounded-xl border bg-background px-3 py-2"
                              type="number"
                              step="0.01"
                              value={rule.amount}
                              onChange={(event) => updateRule(rule.id, { amount: Number.parseFloat(event.target.value) || 0 })}
                            />
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="font-medium text-muted-foreground">Direction</span>
                            <select
                              className="w-full rounded-xl border bg-background px-3 py-2"
                              value={rule.direction}
                              onChange={(event) => updateRule(rule.id, { direction: event.target.value as 'credit' | 'debit' })}
                            >
                              <option value="credit">Income</option>
                              <option value="debit">Expense</option>
                            </select>
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="font-medium text-muted-foreground">Cadence</span>
                            <select
                              className="w-full rounded-xl border bg-background px-3 py-2"
                              value={rule.cadence}
                              onChange={(event) => updateRule(rule.id, { cadence: event.target.value as RecurringCadence })}
                            >
                              {cadenceOptions().map((cadence) => (
                                <option key={cadence} value={cadence}>{cadenceLabel(cadence)}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Table
              </Button>
              <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('calendar')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendar
              </Button>
            </ButtonGroup>
          </div>
          <div className="w-full md:max-w-md">
            <InputGroup>
              <InputGroupInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search forecast..." />
              <InputGroupAddon>
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">{filteredForecast.length} results</InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        <div className="mt-5">
        {viewMode === 'table' ? (
          <ForecastTable
            sortedForecast={sortedForecast}
            handleSort={handleSort}
            sortConfig={sortConfig}
            onAddTransaction={() => undefined}
            warningAmount={warningAmount}
            warningColor={warningColor}
            warningOperator={warningOperator}
            warningStyle={warningStyle}
            enableQuickActions={false}
            onOpenExternalDate={accessToken ? (date) => window.open(`https://calendar.google.com/calendar/u/0/r/day/${format(date, 'yyyy')}/${format(date, 'MM')}/${format(date, 'dd')}`, '_blank') : undefined}
          />
        ) : (
          <ForecastCalendar
            forecast={sortedForecast}
            weekStartDay={weekStartDay}
            startDate={forecast.length > 0 ? forecast[0].when : new Date()}
            endDate={defaultForecastEndDate(startOfDay(addDays(new Date(), 1)), timespan)}
            onAddTransaction={() => undefined}
            warningAmount={warningAmount}
            warningColor={warningColor}
            warningOperator={warningOperator}
            warningStyle={warningStyle}
            enableQuickActions={false}
            onOpenExternalDate={accessToken ? (date) => window.open(`https://calendar.google.com/calendar/u/0/r/day/${format(date, 'yyyy')}/${format(date, 'MM')}/${format(date, 'dd')}`, '_blank') : undefined}
          />
        )}
        </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
