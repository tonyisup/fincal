import { describe, expect, it, vi } from 'vitest';
import { parseEventTitle, parseGoogleDate } from '../src/lib/utils';

describe('parseEventTitle', () => {
  it('parses calendar event titles with currency amounts', () => {
    expect(parseEventTitle('$123.45 Rent')).toEqual({
      amount: 123.45,
      description: 'Rent',
    });
  });

  it('parses calendar event titles without a dollar sign', () => {
    expect(parseEventTitle('50 Coffee')).toEqual({
      amount: 50,
      description: 'Coffee',
    });
  });

  it('returns null for invalid titles', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(parseEventTitle('not money')).toBeNull();

    warn.mockRestore();
  });
});

describe('parseGoogleDate', () => {
  it('parses Google all-day dates', () => {
    const date = parseGoogleDate('2026-06-30');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(30);
  });

  it('returns null for missing or invalid dates', () => {
    expect(parseGoogleDate(undefined)).toBeNull();
    expect(parseGoogleDate('not-a-date')).toBeNull();
  });
});
