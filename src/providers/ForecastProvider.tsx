import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfDay, addDays } from 'date-fns';
import type { ForecastEntry } from '@/types/calendar';
import type {
  ImportColumnMapping,
  ImportIssue,
  ImportPreview,
  NormalizedTransaction,
  RecurringRule,
} from '@/types/forecast';
import { trackEvent } from '@/lib/analytics';
import { defaultForecastEndDate, generateForecast, forecastPointsToEntries } from '@/lib/forecast';


import { type WarningStyle } from '@/components/ForecastCalendar';
import { type SortKey, type SortDirection } from '@/components/ForecastTable';

export const STORAGE_KEY = 'fincal_session_v2';

export interface StoredSession {
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

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface ForecastContextType {
  // Config
  currentBalance: string;
  setCurrentBalance: (val: string) => void;
  timespan: string;
  setTimespan: (val: string) => void;
  weekStartDay: 0 | 1;
  setWeekStartDay: (val: 0 | 1) => void;
  // Warnings
  warningAmount: number;
  setWarningAmount: (val: number) => void;
  warningColor: string;
  setWarningColor: (val: string) => void;
  warningOperator: '<' | '<=';
  setWarningOperator: (val: '<' | '<=') => void;
  warningStyle: WarningStyle;
  setWarningStyle: (val: WarningStyle) => void;
  // UI State
  viewMode: 'table' | 'calendar';
  setViewMode: (val: 'table' | 'calendar') => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (val: string | null) => void;
  // Import Flow
  preview: ImportPreview | null;
  setPreview: (val: ImportPreview | null) => void;
  mapping: ImportColumnMapping | null;
  setMapping: (val: ImportColumnMapping | null) => void;
  importIssues: ImportIssue[];
  setImportIssues: (val: ImportIssue[]) => void;
  importedTransactions: NormalizedTransaction[];
  setImportedTransactions: (val: NormalizedTransaction[]) => void;
  // Data State
  recurringRules: RecurringRule[];
  setRecurringRules: React.Dispatch<React.SetStateAction<RecurringRule[]>>;
  updateRule: (ruleId: string, patch: Partial<RecurringRule>) => void;
  oneOffTransactions: NormalizedTransaction[];
  setOneOffTransactions: React.Dispatch<React.SetStateAction<NormalizedTransaction[]>>;
  forecast: ForecastEntry[];
  setForecast: (val: ForecastEntry[]) => void;
  // Computed
  forecastStartDate: string;
  forecastEndDate: string;
  filteredForecast: ForecastEntry[];
  sortedForecast: ForecastEntry[];
  generateLocalForecast: () => void;
  // Manual adjustments
  manualDescription: string;
  setManualDescription: (val: string) => void;
  manualAmount: string;
  setManualAmount: (val: string) => void;
  manualDate: string;
  setManualDate: (val: string) => void;
  addManualAdjustment: () => void;
  // Calendars
  selectedCreditCalendarId: string | undefined;
  setSelectedCreditCalendarId: (val: string | undefined) => void;
  selectedDebitCalendarId: string | undefined;
  setSelectedDebitCalendarId: (val: string | undefined) => void;
}

const ForecastContext = createContext<ForecastContextType | null>(null);

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch (error) {
    console.warn('Failed to load session', error);
    return null;
  }
}

export function ForecastProvider({ children }: { children: React.ReactNode }) {
  // Load session once at the top
  const session = loadSession();

  const [currentBalance, setCurrentBalance] = useState(() => {
    return session?.currentBalance ?? '4000';
  });
  const [timespan, setTimespan] = useState(() => {
    return session?.timespan ?? '90D';
  });
  const [weekStartDay, setWeekStartDay] = useState<0 | 1>(() => {
    return session?.weekStartDay ?? 0;
  });
  const [warningAmount, setWarningAmount] = useState<number>(() => {
    return session?.warningAmount ?? 0;
  });
  const [warningColor, setWarningColor] = useState<string>(() => {
    return session?.warningColor ?? '#b45309';
  });
  const [warningOperator, setWarningOperator] = useState<'<' | '<='>(() => {
    return session?.warningOperator ?? '<';
  });
  const [warningStyle, setWarningStyle] = useState<WarningStyle>(() => {
    return session?.warningStyle ?? 'Balance Color';
  });
  
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [preview, setPreview] = useState<ImportPreview | null>(() => {
    return session?.preview ?? null;
  });
  const [mapping, setMapping] = useState<ImportColumnMapping | null>(() => {
    return session?.mapping ?? null;
  });
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [importedTransactions, setImportedTransactions] = useState<NormalizedTransaction[]>(() => {
    return session?.importedTransactions ?? [];
  });
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(() => {
    return session?.recurringRules ?? [];
  });
  const [oneOffTransactions, setOneOffTransactions] = useState<NormalizedTransaction[]>(() => {
    return session?.oneOffTransactions ?? [];
  });
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);

  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));

  const [selectedCreditCalendarId, setSelectedCreditCalendarId] = useState<string | undefined>(() => {
    return session?.selectedCreditCalendarId;
  });
  const [selectedDebitCalendarId, setSelectedDebitCalendarId] = useState<string | undefined>(() => {
    return session?.selectedDebitCalendarId;
  });

  // We need the App-level Auth logic exported somehow, but for now we expect useAuth to provide it if used.
  // Actually, we can fetch calendars here if token is available. Let's let the components handle fetching, 
  // or we can just keep state here.

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

  const forecastStartDate = format(startOfDay(addDays(new Date(), 1)), 'yyyy-MM-dd');
  const forecastEndDate = useMemo(
    () => format(defaultForecastEndDate(startOfDay(addDays(new Date(), 1)), timespan), 'yyyy-MM-dd'),
    [timespan],
  );

  const updateRule = useCallback((ruleId: string, patch: Partial<RecurringRule>) => {
    trackEvent('recurring_rule_confirmed', { ruleId, patchKeys: Object.keys(patch) });
    setRecurringRules((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    );
  }, []);

  const generateLocalForecast = useCallback(() => {
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
  }, [currentBalance, forecastEndDate, forecastStartDate, oneOffTransactions, recurringRules]);

  const addManualAdjustment = useCallback(() => {
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
  }, [manualAmount, manualDate, manualDescription]);

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

  const value: ForecastContextType = {
    currentBalance, setCurrentBalance,
    timespan, setTimespan,
    weekStartDay, setWeekStartDay,
    warningAmount, setWarningAmount,
    warningColor, setWarningColor,
    warningOperator, setWarningOperator,
    warningStyle, setWarningStyle,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    sortConfig, setSortConfig,
    isLoading, setIsLoading,
    error, setError,
    successMessage, setSuccessMessage,
    preview, setPreview,
    mapping, setMapping,
    importIssues, setImportIssues,
    importedTransactions, setImportedTransactions,
    recurringRules, setRecurringRules,
    updateRule,
    oneOffTransactions, setOneOffTransactions,
    forecast, setForecast,
    forecastStartDate, forecastEndDate,
    filteredForecast, sortedForecast,
    generateLocalForecast,
    manualDescription, setManualDescription,
    manualAmount, setManualAmount,
    manualDate, setManualDate,
    addManualAdjustment,
    selectedCreditCalendarId, setSelectedCreditCalendarId,
    selectedDebitCalendarId, setSelectedDebitCalendarId
  };

  return <ForecastContext.Provider value={value}>{children}</ForecastContext.Provider>;
}

export function useForecastContext() {
  const context = useContext(ForecastContext);
  if (!context) {
    throw new Error('useForecastContext must be used within ForecastProvider');
  }
  return context;
}