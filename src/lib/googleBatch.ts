import type { CalendarEvent } from '@/types/calendar';

export interface BatchRequest {
  method: string;
  url: string; // Relative path, e.g. /calendar/v3/calendars/primary/events
  body?: unknown;
  contentId?: string;
}

export function createBatchBody(requests: BatchRequest[], boundary: string = `batch_${Date.now()}_${Math.random().toString(36).substring(2)}`) {
  const parts = requests.map((req, index) => {
    const contentId = req.contentId || `item${index}`;
    let part = `--${boundary}\r\n`;
    part += `Content-Type: application/http\r\n`;
    part += `Content-ID: ${contentId}\r\n\r\n`;

    part += `${req.method} ${req.url} HTTP/1.1\r\n`;
    if (req.body) {
      const jsonBody = JSON.stringify(req.body);
      const byteLength = new TextEncoder().encode(jsonBody).length;
      part += `Content-Type: application/json\r\n`;
      part += `Content-Length: ${byteLength}\r\n\r\n`;
      part += jsonBody;
      part += `\r\n`;
    } else {
        part += `\r\n`;
    }

    return part;
  });

  const body = parts.join('') + `--${boundary}--`;
  return { body, boundary };
}

export async function fetchCalendarEvents(
  calendarId: string,
  accessToken: string,
  options?: { timeMin?: string; timeMax?: string }
): Promise<CalendarEvent[]> {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const timeMin = options?.timeMin || oneYearAgo.toISOString();
  const timeMax = options?.timeMax || now.toISOString();

  const allEvents: CalendarEvent[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to load Google Calendar events.');
    }
    const data = await response.json();
    allEvents.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allEvents;
}