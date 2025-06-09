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

// Regex to capture: optional $, then digits (with optional decimal), then whitespace, then description
// Example: $123.45 My Event -> 123.45, My Event
// Example: 50 My Event -> 50, My Event
const EVENT_TITLE_REGEX = /^\$?\s*(\d+(?:\.\d{1,2})?)\s*(.*)$/;

export function parseEventTitle(title: string | undefined): ParsedEvent | null {
  if (!title) return null;
  const match = title.match(EVENT_TITLE_REGEX);
  if (match && match[1] && match[2] !== undefined) {
    const amount = parseFloat(match[1]);
    const description = match[2].trim();
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