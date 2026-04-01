const STORAGE_KEY = 'fincal_analytics_events';

interface AnalyticsEvent {
  name: string;
  recordedAt: string;
  payload?: Record<string, unknown>;
}

export function trackEvent(name: string, payload?: Record<string, unknown>) {
  // Sanitize payload to only persist non-sensitive data
  const sanitizedPayload = payload ? {
    ...Object.fromEntries(
      Object.entries(payload).filter(([key]) =>
        // Allowlist specific keys that are safe to persist
        ['transactions', 'rules', 'signedIn', 'fileName', 'size', 'ruleId', 'patchKeys', 'recurringRules', 'oneOffTransactions'].includes(key)
      )
    )
  } : undefined;

  const nextEvent: AnalyticsEvent = {
    name,
    recordedAt: new Date().toISOString(),
    payload: sanitizedPayload,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    current.push(nextEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(-200)));
  } catch (error) {
    console.warn('Failed to persist analytics event', error);
  }

  if (import.meta.env.DEV) {
    console.info('[analytics]', nextEvent);
  }
}