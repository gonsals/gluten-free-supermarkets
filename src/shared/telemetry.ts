import { config } from './config';

type TechnicalEvent =
  | 'lookup_completed'
  | 'cache_hit'
  | 'render_error'
  | 'lookup_timeout'
  | 'lookup_failed'
  | 'storage_failed'
  | 'sync_failed';
export function reportTechnicalEvent(event: TechnicalEvent, durationMs?: number) {
  if (!config.telemetryUrl.startsWith('https://')) return;
  // Only allowlisted technical metadata leaves the device. Never send product/user data.
  void fetch(config.telemetryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      release: config.version,
      environment: config.appEnv,
      ...(durationMs === undefined ? {} : { durationMs: Math.round(durationMs / 100) * 100 }),
    }),
  }).catch(() => undefined);
}
