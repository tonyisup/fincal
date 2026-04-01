import { useForecastContext } from '@/providers/ForecastProvider';
import { useAuth } from '@/App';
import { FileSpreadsheet, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { detectImportMapping, normalizeImportedTransactions, parseImportFile } from '@/lib/import';
import { detectRecurringRules, googleEventsToTransactions, ruleToGoogleEvent } from '@/lib/forecast';
import { trackEvent } from '@/lib/analytics';
import { fetchCalendarEvents } from '@/lib/googleBatch';
import { useCallback, useEffect, useState } from 'react';
import type { ImportColumnMapping } from '@/types/forecast';
import type { Calendar, CalendarEvent } from '@/types/calendar';

function mappingValue(mapping: ImportColumnMapping, key: keyof ImportColumnMapping) {
  return mapping[key] ?? '';
}

export function ImportPage() {
  const {
    preview, setPreview,
    mapping, setMapping,
    importIssues, setImportIssues,
    importedTransactions, setImportedTransactions,
    recurringRules, setRecurringRules,
    isLoading, setIsLoading,
    error, setError,
    successMessage, setSuccessMessage,
    selectedCreditCalendarId, setSelectedCreditCalendarId,
    selectedDebitCalendarId, setSelectedDebitCalendarId
  } = useForecastContext();

  const { accessToken, userProfile, login, hasWriteAccess, grantWriteAccess } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    const fetchCalendars = async () => {
      try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCalendars(data.items ?? []);
        }
      } catch (err) {
        console.error(err);
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

  const fetchEvents = useCallback(async (
    calendarId: string,
    options?: { timeMin?: string; timeMax?: string }
  ): Promise<CalendarEvent[]> => {
    if (!accessToken) return [];
    return fetchCalendarEvents(calendarId, accessToken, options);
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
      const exportedRules: string[] = [];
      const failedRules: Array<{ id: string; label: string; error: string }> = [];

      for (const rule of enabledRules) {
        const calendarId = rule.direction === 'credit' ? selectedCreditCalendarId : selectedDebitCalendarId;
        const eventBody = ruleToGoogleEvent(rule);

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
          },
        );

        if (response.ok) {
          exportedRules.push(rule.id);
        } else {
          const errorText = await response.text();
          failedRules.push({ id: rule.id, label: rule.label, error: errorText || 'Unknown error' });
        }
      }

      if (failedRules.length > 0) {
        const failedSummary = failedRules.map(f => `${f.label}: ${f.error}`).join('; ');
        throw new Error(`Exported ${exportedRules.length} rules but ${failedRules.length} failed: ${failedSummary}`);
      }

      setSuccessMessage(`Exported ${exportedRules.length} recurring rules to Google Calendar.`);
      trackEvent('google_export_completed', { rules: exportedRules.length });
    } catch (exportError) {
      console.error(exportError);
      setError(exportError instanceof Error ? exportError.message : 'Google export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Import Transactions</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Upload CSV or XLSX files, review detected columns, and turn raw history into forecast-ready recurring items.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-emerald-700">
            {successMessage}
          </div>
        )}

        <Card className="overflow-hidden border-border/40 bg-card/40 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5" />
              File Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
              <div className="space-y-4 rounded-[1.5rem] border border-dashed border-border/60 p-4 relative">
                {isLoading && (
                   <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-[1.5rem]">
                      <span className="text-emerald-500 font-semibold animate-pulse">Loading...</span>
                   </div>
                )}
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-muted/40 px-4 py-12 text-center transition-colors hover:bg-muted/60">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="font-medium">Drop in CSV or Excel</p>
                    <p className="text-xs text-muted-foreground max-w-[200px] mt-1 mx-auto">Supports .csv, .xlsx, and .xls.</p>
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

                <div className="space-y-3 rounded-[1.25rem] bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Import progress</span>
                    <span className="rounded-full bg-background/50 border border-border/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {preview ? 'Draft ready' : 'Waiting'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Upload a transaction export', done: Boolean(preview) },
                      { label: 'Confirm the important columns', done: Boolean(preview && mapping?.dateColumn && mapping?.descriptionColumn && (mapping?.amountColumn || mapping?.creditColumn || mapping?.debitColumn)) },
                      { label: 'Import and detect rules', done: importedTransactions.length > 0 },
                    ].map((item, index) => (
                      <div key={item.label} className="flex items-center gap-3 rounded-xl bg-background/50 border border-border/30 px-3 py-2 text-sm shadow-sm">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          item.done ? 'bg-emerald-500 text-emerald-950' : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.done ? '✓' : index + 1}
                        </span>
                        <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {preview && (
                    <Button variant="outline" className="w-full rounded-full" onClick={resetImportDraft}>
                      Clear Draft
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/40 bg-card/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Rows loaded</p>
                    <p className="mt-2 text-2xl font-semibold">{preview?.rows.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Headers found</p>
                    <p className="mt-2 text-2xl font-semibold">{preview?.headers.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Import source</p>
                    <p className="mt-2 text-2xl font-semibold">{preview?.source?.toUpperCase() ?? 'FILE'}</p>
                  </div>
                </div>

                {preview && mapping && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        ['Date column', 'dateColumn'],
                        ['Description column', 'descriptionColumn'],
                        ['Signed amount', 'amountColumn'],
                        ['Debit column', 'debitColumn'],
                        ['Credit column', 'creditColumn'],
                        ['Account column', 'accountColumn'],
                      ].map(([label, key]) => (
                        <label key={key} className="space-y-2 text-sm">
                          <span className="font-medium text-muted-foreground text-xs">{label}</span>
                          <select
                            value={mappingValue(mapping, key as keyof ImportColumnMapping)}
                            onChange={(event) =>
                              setMapping(mapping ? { ...mapping, [key]: event.target.value || undefined } as ImportColumnMapping : null)
                            }
                            className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 outline-none focus:border-emerald-500/50"
                          >
                            <option value="">Not used</option>
                            {preview.headers.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/50 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-sm">Ready to detect recurring items?</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          FinCal will clean up {preview.rows.length} rows and flag likely repeating transactions.
                        </p>
                      </div>
                      <Button onClick={completeImport} className="rounded-full bg-emerald-500 text-emerald-950 font-semibold hover:bg-emerald-600 px-6">
                        Import & Detect
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {importIssues.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 font-medium text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  Import issues
                </div>
                <div className="mt-2 space-y-1 text-sm text-amber-500/80">
                  {importIssues.slice(0, 8).map((issue) => (
                    <p key={`${issue.rowNumber}-${issue.message}`}>Row {issue.rowNumber}: {issue.message}</p>
                  ))}
                  {importIssues.length > 8 && <p>+{importIssues.length - 8} more rows need attention.</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Sync */}
        <Card className="overflow-hidden border-border/40 bg-card/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Optional Google Integration</CardTitle>
            <CardDescription>Pull from existing Google calendars or send confirmed rules back out.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessToken ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/40 bg-card/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Connected account</p>
                    <p className="mt-2 truncate text-sm font-semibold">{userProfile?.email ?? 'Google connected'}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Export readiness</p>
                    <p className="mt-2 text-sm font-semibold">{selectedCreditCalendarId && selectedDebitCalendarId ? 'Calendars selected' : 'Choose calendars below'}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 rounded-[1.25rem] border border-border/40 bg-muted/20 p-4 text-sm">
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground block mb-2">Income calendar</span>
                    <select className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 outline-none focus:border-emerald-500/50" value={selectedCreditCalendarId ?? ''} onChange={(event) => setSelectedCreditCalendarId(event.target.value || undefined)}>
                      <option value="">Select calendar</option>
                      {calendars.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>{calendar.summary}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 rounded-[1.25rem] border border-border/40 bg-muted/20 p-4 text-sm">
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground block mb-2">Expense calendar</span>
                    <select className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 outline-none focus:border-emerald-500/50" value={selectedDebitCalendarId ?? ''} onChange={(event) => setSelectedDebitCalendarId(event.target.value || undefined)}>
                      <option value="">Select calendar</option>
                      {calendars.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>{calendar.summary}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" className="rounded-full" onClick={() => void importFromGoogleCalendars()}>Load History From Google</Button>
                  <Button variant="outline" className="rounded-full" onClick={() => void exportRecurringRules()}>
                    Export Enabled Rules To Google
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-border/60 p-5 text-sm text-center text-muted-foreground">
                <p>Connect Google only if you want to import from existing calendars or export confirmed recurring rules.</p>
                <Button className="mt-4 mx-auto block rounded-full" variant="outline" onClick={login}>Connect Google Account</Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}