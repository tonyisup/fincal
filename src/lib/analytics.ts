const STORAGE_KEY = 'fincal_analytics_events';

interface AnalyticsEvent {
  name: string;
  recordedAt: string;
  payload?: Record<string, unknown>;
}

export function trackEvent(name: string, payload?: Record<string, unknown>) {
  const nextEvent: AnalyticsEvent = {
    name,
    recordedAt: new Date().toISOString(),
    payload,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    current.push(nextEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(-200)));
  } catch (error) {
    console.warn('Failed to persist analytics event', error);
  }

  console.info('[analytics]', nextEvent);
}
