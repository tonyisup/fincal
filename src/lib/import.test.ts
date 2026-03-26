import { describe, expect, it } from 'vitest';
import { detectImportMapping, normalizeImportedTransactions } from '@/lib/import';

describe('detectImportMapping', () => {
  it('finds common banking headers', () => {
    const mapping = detectImportMapping(['Posted Date', 'Description', 'Amount', 'Category']);
    expect(mapping.dateColumn).toBe('Posted Date');
    expect(mapping.descriptionColumn).toBe('Description');
    expect(mapping.amountColumn).toBe('Amount');
    expect(mapping.categoryColumn).toBe('Category');
  });
});

describe('normalizeImportedTransactions', () => {
  it('supports signed amount columns', () => {
    const result = normalizeImportedTransactions(
      [
        { Date: '03/15/2026', Description: 'Paycheck', Amount: '1250.00' },
        { Date: '03/18/2026', Description: 'Rent', Amount: '-950.00' },
      ],
      {
        dateColumn: 'Date',
        descriptionColumn: 'Description',
        amountColumn: 'Amount',
      },
      'csv',
    );

    expect(result.issues).toHaveLength(0);
    expect(result.transactions.map((tx) => tx.amount)).toEqual([1250, -950]);
  });

  it('supports split credit and debit columns', () => {
    const result = normalizeImportedTransactions(
      [
        { Date: '03/20/2026', Description: 'Salary', Credit: '2000.00', Debit: '' },
        { Date: '03/21/2026', Description: 'Groceries', Credit: '', Debit: '120.55' },
      ],
      {
        dateColumn: 'Date',
        descriptionColumn: 'Description',
        creditColumn: 'Credit',
        debitColumn: 'Debit',
      },
      'xlsx',
    );

    expect(result.transactions.map((tx) => tx.amount)).toEqual([2000, -120.55]);
  });

  it('reports invalid rows', () => {
    const result = normalizeImportedTransactions(
      [{ Date: '', Description: '', Amount: '0' }],
      {
        dateColumn: 'Date',
        descriptionColumn: 'Description',
        amountColumn: 'Amount',
      },
      'csv',
    );

    expect(result.transactions).toHaveLength(0);
    expect(result.issues[0].rowNumber).toBe(2);
  });
});
