import { describe, expect, it } from 'vitest';
import { detectRecurringRules, forecastPointsToEntries, generateForecast, googleEventsToTransactions } from '@/lib/forecast';
import type { NormalizedTransaction } from '@/types/forecast';

describe('detectRecurringRules', () => {
  it('detects monthly recurring expenses', () => {
    const transactions: NormalizedTransaction[] = [
      { id: '1', source: 'csv', date: '2026-01-01', description: 'Rent', amount: -1200 },
      { id: '2', source: 'csv', date: '2026-02-01', description: 'Rent', amount: -1200 },
      { id: '3', source: 'csv', date: '2026-03-01', description: 'Rent', amount: -1200 },
    ];

    const rules = detectRecurringRules(transactions);
    expect(rules).toHaveLength(1);
    expect(rules[0].cadence).toBe('monthly');
    expect(rules[0].direction).toBe('debit');
    expect(rules[0].amount).toBe(1200);
  });

  it('groups by description only, allowing varying amounts/sources', () => {
    const transactions: NormalizedTransaction[] = [
      { id: '1', source: 'csv', date: '2026-01-01', description: 'Utility Bill', amount: -100 },
      { id: '2', source: 'xlsx', date: '2026-02-01', description: 'Utility Bill', amount: -110 },
      { id: '3', source: 'csv', date: '2026-03-01', description: 'Utility Bill', amount: -105 },
    ];

    const rules = detectRecurringRules(transactions);
    expect(rules).toHaveLength(1);
    expect(rules[0].cadence).toBe('monthly');
    expect(rules[0].direction).toBe('debit');
    // Average of 100, 110, 105
    expect(rules[0].amount).toBeCloseTo(105, 0);
  });

  it('detects semimonthly patterns with day-of-month anchors', () => {
    const transactions: NormalizedTransaction[] = [
      { id: '1', source: 'csv', date: '2026-01-01', description: 'Paycheck', amount: 2000 },
      { id: '2', source: 'csv', date: '2026-01-15', description: 'Paycheck', amount: 2000 },
      { id: '3', source: 'csv', date: '2026-02-01', description: 'Paycheck', amount: 2000 },
      { id: '4', source: 'csv', date: '2026-02-15', description: 'Paycheck', amount: 2000 },
    ];

    const rules = detectRecurringRules(transactions);
    expect(rules).toHaveLength(1);
    expect(rules[0].cadence).toBe('semimonthly');
    expect(rules[0].amount).toBe(2000);
  });
});

describe('generateForecast', () => {
  it('combines recurring rules and one-off transactions', () => {
    const points = generateForecast({
      currentBalance: 1000,
      recurringRules: [
        {
          id: 'rule-pay',
          label: 'Paycheck',
          amount: 500,
          direction: 'credit',
          cadence: 'weekly',
          anchorDate: '2026-03-27',
          confidence: 0.9,
          sourceTransactionIds: ['a', 'b'],
          enabled: true,
        },
      ],
      oneOffTransactions: [
        { id: 'manual-1', source: 'manual', date: '2026-03-28', description: 'Vet bill', amount: -200 },
      ],
      startDate: '2026-03-27',
      endDate: '2026-04-03',
    });

    expect(points.map((point) => point.balance)).toEqual([1500, 1300, 1800]);
    const entries = forecastPointsToEntries(points, '2026-03-27', 1000);
    expect(entries[0].summary).toBe('Starting Balance');
    expect(entries[entries.length - 1].balance).toBe(1800);
  });

  it('handles month-end dates correctly (Feb 28/29)', () => {
    const points = generateForecast({
      currentBalance: 1000,
      recurringRules: [
        {
          id: 'rule-rent',
          label: 'Rent',
          amount: 1200,
          direction: 'debit',
          cadence: 'monthly',
          anchorDate: '2026-01-31',
          confidence: 0.95,
          sourceTransactionIds: ['rent-1'],
          enabled: true,
        },
      ],
      oneOffTransactions: [],
      startDate: '2026-02-01',
      endDate: '2026-03-31',
    });

    // Should generate occurrences for Feb and March
    expect(points.length).toBeGreaterThan(0);

    // Verify amounts are preserved
    points.forEach(point => {
      point.transactions.forEach(tx => {
        expect(Math.abs(tx.amount)).toBe(1200);
      });
    });

    // Assert exact occurrence dates: Feb 28 and March 31
    const dates = points.map(p => p.date);
    expect(dates).toContain('2026-02-28');
    expect(dates).toContain('2026-03-31');
  });
});

describe('googleEventsToTransactions', () => {
  it('converts event titles with explicit signs', () => {
    const transactions = googleEventsToTransactions([
      {
        id: 'event-1',
        summary: '+$1200 Salary',
        start: { date: '2026-03-30' },
      },
      {
        id: 'event-2',
        summary: '-$75 Utilities',
        start: { date: '2026-03-30' },
      },
    ], 'credit');

    expect(transactions[0].amount).toBe(1200);
    expect(transactions[1].amount).toBe(75);
  });
});