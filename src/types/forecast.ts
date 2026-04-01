export type ForecastSource = 'csv' | 'xlsx' | 'google' | 'manual';

export interface NormalizedTransaction {
  id: string;
  source: ForecastSource;
  date: string;
  description: string;
  amount: number;
  accountName?: string;
  category?: string;
  raw?: Record<string, unknown>;
}

export type RecurringCadence =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export interface RecurringRule {
  id: string;
  label: string;
  amount: number;
  direction: 'credit' | 'debit';
  cadence: RecurringCadence;
  anchorDate: string;
  confidence: number;
  sourceTransactionIds: string[];
  enabled: boolean;
}

export interface ForecastInput {
  currentBalance: number;
  recurringRules: RecurringRule[];
  oneOffTransactions: NormalizedTransaction[];
  startDate: string;
  endDate: string;
}

export interface ForecastPointTransaction {
  id: string;
  label: string;
  amount: number;
  source: 'recurring' | 'one_off';
}

export interface ForecastPoint {
  date: string;
  balance: number;
  transactions: ForecastPointTransaction[];
}

export interface ImportColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  accountColumn?: string;
  categoryColumn?: string;
}

export interface ImportPreview {
  headers: string[];
  rows: Record<string, string>[];
  source: Extract<ForecastSource, 'csv' | 'xlsx'>;
}

export interface ImportIssue {
  rowNumber: number;
  message: string;
}
