export interface Calendar {
  id: string;
  summary: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string; // Title
  description?: string; // Body, not used here but good to know
  start?: { date?: string; dateTime?: string; timeZone?: string }; // For all-day events, `date` is YYYY-MM-DD
  end?: { date?: string; dateTime?: string; timeZone?: string };
}

export interface Transaction {
  date: Date;
  amount: number; // positive for credit, negative for debit
  description: string;
  type: 'credit' | 'debit' | 'initial';
}

export interface ForecastEntry {
  balance: number;
  amount: number; // The amount of THIS transaction (positive for credit, positive for debit for display)
  summary: string;
  when: Date;
  type: 'credit' | 'debit' | 'initial';
}