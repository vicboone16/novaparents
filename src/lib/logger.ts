/**
 * Structured Error Logger
 * ────────────────────────
 * Single call-site for all error and warning logging.
 * Replace the console.* calls with your observability service
 * (Sentry, PostHog, Datadog, etc.) without touching every DAL file.
 *
 * Usage:
 *   logError('parent-insights-dal', err, { studentId, action: 'getTodayInsight' });
 *   logWarn('snapshots', 'Post-create read-back returned null', { id });
 */

export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  // TODO (production): forward to Sentry / PostHog here
  console.error(`[${context}]`, message, meta ?? '');
}

export function logWarn(
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  // TODO (production): forward to PostHog / analytics here
  console.warn(`[${context}]`, message, meta ?? '');
}
