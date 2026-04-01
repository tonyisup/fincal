import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  isAfter,
  parseISO,
  setDate,
  startOfDay,
} from 'date-fns';
import type {
  ForecastInput,
  ForecastPoint,
  ForecastPointTransaction,
  NormalizedTransaction,
  RecurringCadence,
  RecurringRule,
} from '@/types/forecast';
import type { CalendarEvent, ForecastEntry } from '@/types/calendar';
import { parseEventTitle, parseGoogleDate } from '@/lib/utils';

function normalizeDescription(description: string) {
  return description
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCadence(intervals: number[], dates: Date[]): RecurringCadence | null {
  if (intervals.length === 0) {
    return null;
  }

  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const daysOfMonth = dates.map((date) => date.getDate()).sort((a, b) => a - b);
  const hasSemiMonthlyPattern =
    daysOfMonth.length >= 2 &&
    daysOfMonth.some((day) => day <= 2) &&
    daysOfMonth.some((day) => day >= 14 && day <= 16);

  if (Math.abs(average - 7) <= 2) return 'weekly';
  if (Math.abs(average - 14) <= 2) return 'biweekly';
  if (hasSemiMonthlyPattern || Math.abs(average - 15) <= 3) return 'semimonthly';
  if (Math.abs(average - 30) <= 4) return 'monthly';
  if (Math.abs(average - 365) <= 20) return 'yearly';
  return null;
}

function cadenceIntervalScore(cadence: RecurringCadence, intervals: number[]) {
  const expected = cadence === 'weekly'
    ? 7
    : cadence === 'biweekly'
      ? 14
      : cadence === 'semimonthly'
        ? 15
        : cadence === 'monthly'
          ? 30
          : cadence === 'yearly'
            ? 365
            : 21;

  const averageDeviation =
    intervals.reduce((sum, interval) => sum + Math.abs(interval - expected), 0) / Math.max(intervals.length, 1);
  return Math.max(0.45, Math.min(0.98, 1 - averageDeviation / Math.max(expected, 1)));
}

export function detectRecurringRules(transactions: NormalizedTransaction[]): RecurringRule[] {
  const groups = new Map<string, NormalizedTransaction[]>();

  transactions.forEach((transaction) => {
    const normalizedDesc = normalizeDescription(transaction.description);
    if (!normalizedDesc) return;
    const direction = Math.sign(transaction.amount) >= 0 ? 'credit' : 'debit';
    const account = transaction.accountName || '';
    const key = `${normalizedDesc}|${direction}|${account}`;
    const current = groups.get(key) ?? [];
    current.push(transaction);
    groups.set(key, current);
  });

  const candidates: Array<RecurringRule | null> = Array.from(groups.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length < 2) {
        return null;
      }

      const dates = sorted.map((item) => parseISO(item.date));
      const intervals = dates.slice(1).map((date, index) => differenceInCalendarDays(date, dates[index]));
      const cadence = inferCadence(intervals, dates);
      if (!cadence) {
        return null;
      }

      const amounts = sorted.map((item) => Math.abs(item.amount));
      const averageAmount = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
      const averageDeviation =
        amounts.reduce((sum, value) => sum + Math.abs(value - averageAmount), 0) / Math.max(amounts.length, 1);
      const amountSimilarity = Math.max(0.45, Math.min(0.99, 1 - averageDeviation / Math.max(averageAmount, 1)));
      const confidence = Number((cadenceIntervalScore(cadence, intervals) * 0.65 + amountSimilarity * 0.35).toFixed(2));
      const signedAverage =
        sorted.reduce((sum, item) => sum + item.amount, 0) / Math.max(sorted.length, 1);
      const label = sorted[0].description || key;
      const anchorDate = sorted[sorted.length - 1].date;

      const nextRule: RecurringRule = {
        id: `rule-${key}-${anchorDate}`,
        label,
        amount: Number(Math.abs(signedAverage).toFixed(2)),
        direction: signedAverage >= 0 ? 'credit' : 'debit',
        cadence,
        anchorDate,
        confidence,
        sourceTransactionIds: sorted.map((item) => item.id),
        enabled: true,
      };

      return nextRule;
    });

  return candidates
    .filter((rule): rule is RecurringRule => rule !== null)
    .sort((a, b) => b.confidence - a.confidence);
}

function nextOccurrence(date: Date, cadence: RecurringCadence) {
  switch (cadence) {
    case 'weekly':
      return addWeeks(date, 1);
    case 'biweekly':
      return addWeeks(date, 2);
    case 'semimonthly': {
      const day = date.getDate();
      if (day <= 2) {
        return setDate(date, 15);
      }
      const nextMonth = addMonths(date, 1);
      return setDate(nextMonth, 1);
    }
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    case 'custom':
    default:
      return addDays(date, 30);
  }
}

export function generateForecast(input: ForecastInput): ForecastPoint[] {
  const start = startOfDay(parseISO(input.startDate));
  const end = startOfDay(parseISO(input.endDate));
  const upcoming: Array<{ date: string; tx: ForecastPointTransaction }> = [];

  input.recurringRules
    .filter((rule) => rule.enabled)
    .forEach((rule) => {
      let occurrence = startOfDay(parseISO(rule.anchorDate));
      while (occurrence < start) {
        occurrence = nextOccurrence(occurrence, rule.cadence);
      }

      while (!isAfter(occurrence, end)) {
        upcoming.push({
          date: format(occurrence, 'yyyy-MM-dd'),
          tx: {
            id: `${rule.id}-${format(occurrence, 'yyyy-MM-dd')}`,
            label: rule.label,
            amount: rule.direction === 'credit' ? rule.amount : -rule.amount,
            source: 'recurring',
          },
        });
        occurrence = nextOccurrence(occurrence, rule.cadence);
      }
    });

  input.oneOffTransactions.forEach((transaction) => {
    if (transaction.date >= input.startDate && transaction.date <= input.endDate) {
      upcoming.push({
        date: transaction.date,
        tx: {
          id: transaction.id,
          label: transaction.description,
          amount: transaction.amount,
          source: 'one_off',
        },
      });
    }
  });

  const grouped = new Map<string, ForecastPointTransaction[]>();
  upcoming
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.tx.amount - b.tx.amount;
    })
    .forEach((item) => {
      const bucket = grouped.get(item.date) ?? [];
      bucket.push(item.tx);
      grouped.set(item.date, bucket);
    });

  let runningBalance = input.currentBalance;
  return Array.from(grouped.entries()).map(([date, transactions]) => {
    runningBalance += transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    return {
      date,
      balance: Number(runningBalance.toFixed(2)),
      transactions,
    };
  });
}

export function forecastPointsToEntries(points: ForecastPoint[], startDate: string, startingBalance: number): ForecastEntry[] {
  const entries: ForecastEntry[] = [
    {
      balance: startingBalance,
      amount: 0,
      summary: 'Starting Balance',
      when: parseISO(startDate),
      type: 'initial',
    },
  ];

  points.forEach((point) => {
    point.transactions.forEach((transaction, index) => {
      entries.push({
        balance: index === point.transactions.length - 1
          ? point.balance
          : Number(
              (
                point.balance -
                point.transactions.slice(index + 1).reduce((sum, item) => sum + item.amount, 0)
              ).toFixed(2),
            ),
        amount: Math.abs(transaction.amount),
        summary: transaction.label,
        when: parseISO(point.date),
        type: transaction.amount >= 0 ? 'credit' : 'debit',
      });
    });
  });

  return entries.sort((a, b) => a.when.getTime() - b.when.getTime());
}

export function googleEventsToTransactions(events: CalendarEvent[], type: 'credit' | 'debit'): NormalizedTransaction[] {
  return events.flatMap((event) => {
    const date = parseGoogleDate(event.start?.date);
    const parsed = parseEventTitle(event.summary);
    if (!date || !parsed) {
      return [];
    }

    return [{
      id: `google-${event.id}`,
      source: 'google' as const,
      date: format(date, 'yyyy-MM-dd'),
      description: parsed.description || event.summary || 'Google Calendar event',
      amount: type === 'credit' ? Math.abs(parsed.amount) : -Math.abs(parsed.amount),
      raw: { summary: event.summary ?? '' },
    }];
  });
}

export function defaultForecastEndDate(startDate: Date, timespan: string) {
  switch (timespan) {
    case '30D':
      return addDays(startDate, 30);
    case '60D':
      return addDays(startDate, 60);
    case '90D':
      return addDays(startDate, 90);
    case '180D':
      return addDays(startDate, 180);
    case '1Y':
      return addYears(startDate, 1);
    default:
      return addDays(startDate, 90);
  }
}

export function daysUntilNegative(entries: ForecastEntry[]) {
  const firstNegative = entries.find((entry) => entry.balance < 0);
  if (!firstNegative) return null;
  return differenceInCalendarDays(firstNegative.when, new Date());
}

export function lowestBalance(entries: ForecastEntry[]) {
  return entries.reduce((lowest, entry) => (entry.balance < lowest.balance ? entry : lowest), entries[0]);
}

export function ruleToGoogleEvent(rule: RecurringRule) {
  const startDate = parseISO(rule.anchorDate);
  const nextDay = addDays(startDate, 1);
  const frequency =
    rule.cadence === 'weekly'
      ? 'WEEKLY'
      : rule.cadence === 'biweekly'
        ? 'WEEKLY;INTERVAL=2'
        : rule.cadence === 'semimonthly'
          ? 'MONTHLY;BYMONTHDAY=1,15'
          : rule.cadence === 'monthly'
            ? 'MONTHLY'
            : rule.cadence === 'yearly'
              ? 'YEARLY'
              : 'MONTHLY';

  return {
    summary: `${rule.direction === 'credit' ? '+' : '-'}$${rule.amount.toFixed(2)} ${rule.label}`,
    start: { date: format(startDate, 'yyyy-MM-dd') },
    end: { date: format(nextDay, 'yyyy-MM-dd') },
    recurrence: [`RRULE:FREQ=${frequency}`],
    transparency: 'transparent',
  };
}