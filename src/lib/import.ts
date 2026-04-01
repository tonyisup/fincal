import { format, isValid, parse, parseISO } from 'date-fns';
import type {
  ImportColumnMapping,
  ImportIssue,
  ImportPreview,
  NormalizedTransaction,
} from '@/types/forecast';

const DATE_HEADER_HINTS = ['date', 'posted', 'transaction date'];
const DESCRIPTION_HEADER_HINTS = ['description', 'merchant', 'details', 'memo', 'payee', 'name'];
const AMOUNT_HEADER_HINTS = ['amount', 'transaction amount', 'signed amount'];
const DEBIT_HEADER_HINTS = ['debit', 'withdrawal', 'outflow', 'expense'];
const CREDIT_HEADER_HINTS = ['credit', 'deposit', 'inflow', 'income'];
const ACCOUNT_HEADER_HINTS = ['account', 'account name'];
const CATEGORY_HEADER_HINTS = ['category', 'type'];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function uniqueHeaders(headers: string[]) {
  const counts = new Map<string, number>();
  return headers.map((header) => {
    const trimmed = header?.trim() || 'Column';
    const count = counts.get(trimmed) ?? 0;
    counts.set(trimmed, count + 1);
    return count === 0 ? trimmed : `${trimmed} (${count + 1})`;
  });
}

function maybePickHeader(headers: string[], hints: string[]) {
  return headers.find((header) => hints.some((hint) => normalizeHeader(header).includes(hint)));
}

function parseDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directIso = parseISO(trimmed);
  if (isValid(directIso)) {
    return format(directIso, 'yyyy-MM-dd');
  }

  const candidates = ['M/d/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
  for (const candidate of candidates) {
    const parsed = parse(trimmed, candidate, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  return null;
}

function parseAmountValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  if (!normalized) {
    return null;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export async function parseImportFile(file: File): Promise<ImportPreview> {
  const ExcelJS = await import('exceljs');
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file.');
  }

  const matrix: (string | number | null)[][] = [];
  worksheet.eachRow((row) => {
    const rowData: (string | number | null)[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      if (value === null || value === undefined) {
        rowData.push('');
      } else if (typeof value === 'object' && 'text' in value) {
        rowData.push(String(value.text));
      } else if (typeof value === 'object' && 'result' in value) {
        rowData.push(String(value.result));
      } else {
        rowData.push(value as string | number);
      }
    });
    matrix.push(rowData);
  });

  if (matrix.length < 2) {
    throw new Error('The file needs a header row and at least one transaction row.');
  }

  const headers = uniqueHeaders((matrix[0] ?? []).map((value) => String(value ?? '').trim()));
  const rows = matrix
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => {
      const nextRow: Record<string, string> = {};
      headers.forEach((header, index) => {
        nextRow[header] = String(row[index] ?? '').trim();
      });
      return nextRow;
    });

  return {
    headers,
    rows,
    source: file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
  };
}

export function detectImportMapping(headers: string[]): ImportColumnMapping {
  return {
    dateColumn: maybePickHeader(headers, DATE_HEADER_HINTS) ?? headers[0] ?? '',
    descriptionColumn: maybePickHeader(headers, DESCRIPTION_HEADER_HINTS) ?? headers[1] ?? headers[0] ?? '',
    amountColumn: maybePickHeader(headers, AMOUNT_HEADER_HINTS),
    debitColumn: maybePickHeader(headers, DEBIT_HEADER_HINTS),
    creditColumn: maybePickHeader(headers, CREDIT_HEADER_HINTS),
    accountColumn: maybePickHeader(headers, ACCOUNT_HEADER_HINTS),
    categoryColumn: maybePickHeader(headers, CATEGORY_HEADER_HINTS),
  };
}

export function normalizeImportedTransactions(
  rows: Record<string, string>[],
  mapping: ImportColumnMapping,
  source: ImportPreview['source'],
): { transactions: NormalizedTransaction[]; issues: ImportIssue[] } {
  const transactions: NormalizedTransaction[] = [];
  const issues: ImportIssue[] = [];
  const importSessionId = Date.now().toString();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const parsedDate = parseDateValue(row[mapping.dateColumn] ?? '');
    if (!parsedDate) {
      issues.push({ rowNumber, message: 'Invalid or missing date.' });
      return;
    }

    const description = (row[mapping.descriptionColumn] ?? '').trim();
    if (!description) {
      issues.push({ rowNumber, message: 'Missing description.' });
      return;
    }

    let amount: number | null = null;
    if (mapping.amountColumn) {
      amount = parseAmountValue(row[mapping.amountColumn]);
    } else {
      const debit = parseAmountValue(mapping.debitColumn ? row[mapping.debitColumn] : undefined);
      const credit = parseAmountValue(mapping.creditColumn ? row[mapping.creditColumn] : undefined);
      if (credit !== null || debit !== null) {
        amount = (credit ?? 0) - Math.abs(debit ?? 0);
      }
    }

    if (amount === null || amount === 0) {
      issues.push({ rowNumber, message: 'Could not derive a non-zero amount.' });
      return;
    }

    transactions.push({
      id: `${source}-${importSessionId}-${index}-${parsedDate}-${description}`,
      source,
      date: parsedDate,
      description,
      amount,
      accountName: mapping.accountColumn ? row[mapping.accountColumn] : undefined,
      category: mapping.categoryColumn ? row[mapping.categoryColumn] : undefined,
      raw: row,
    });
  });

  return { transactions, issues };
}