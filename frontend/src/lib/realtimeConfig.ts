export const REALTIME_MAX_DELAY_MS = 10_000;
export const REALTIME_POLL_INTERVAL_MS = 8_000;
export const REALTIME_RECONNECT_MAX_MS = 3_000;
export const REALTIME_HEARTBEAT_INTERVAL_MS = 25_000;
export const REALTIME_HEARTBEAT_TIMEOUT_MS = 10_000;

export function getReconnectDelayMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, REALTIME_RECONNECT_MAX_MS);
}
