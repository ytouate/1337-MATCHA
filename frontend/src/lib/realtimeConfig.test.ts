import { describe, expect, it } from "vitest";
import {
  REALTIME_HEARTBEAT_TIMEOUT_MS,
  REALTIME_MAX_DELAY_MS,
  REALTIME_POLL_INTERVAL_MS,
  REALTIME_RECONNECT_MAX_MS,
  getReconnectDelayMs,
} from "./realtimeConfig";

describe("realtimeConfig", () => {
  it("keeps poll and reconnect delays within the 10s SLA", () => {
    expect(REALTIME_POLL_INTERVAL_MS).toBeLessThanOrEqual(
      REALTIME_MAX_DELAY_MS,
    );
    expect(REALTIME_RECONNECT_MAX_MS).toBeLessThanOrEqual(
      REALTIME_MAX_DELAY_MS,
    );
    expect(REALTIME_HEARTBEAT_TIMEOUT_MS).toBeLessThanOrEqual(
      REALTIME_MAX_DELAY_MS,
    );
  });

  it("caps exponential reconnect backoff at REALTIME_RECONNECT_MAX_MS", () => {
    expect(getReconnectDelayMs(0)).toBe(1000);
    expect(getReconnectDelayMs(1)).toBe(2000);
    expect(getReconnectDelayMs(2)).toBe(3000);
    expect(getReconnectDelayMs(5)).toBe(3000);
  });
});
