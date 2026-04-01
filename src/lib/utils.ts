import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ParsedEvent {
  amount: number;
  description: string;
}

// Regex to capture an optional sign, optional $, number, then description.
const EVENT_TITLE_REGEX = /^([+-])?\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(.*)$/;

export function parseEventTitle(title: string | undefined): ParsedEvent | null {
  if (!title) return null;
  const match = title.match(EVENT_TITLE_REGEX);
  if (match && match[2] && match[3] !== undefined) {
    const sign = match[1] === '-' ? -1 : 1;
    const amount = parseFloat(match[2]) * sign;
    const description = match[3].trim();
    if (!isNaN(amount)) {
      return { amount, description };
    }
  }
  console.warn(`Could not parse event title: "${title}"`);
  return null;
}

// Helper to safely parse date strings from Google Calendar
// Google Calendar 'all-day' events usually return YYYY-MM-DD for event.start.date
export function parseGoogleDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(parsedDate) ? parsedDate : null;
}
