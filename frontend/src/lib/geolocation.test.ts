import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRECISE_GEOLOCATION_OPTIONS,
  formatAccuracyMeters,
  getPrecisePosition,
  isLowGpsAccuracy,
  mapGeolocationError,
} from "./geolocation";

function createPosition(
  latitude: number,
  longitude: number,
  accuracy: number,
): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

function createGeolocationError(code: number, message: string) {
  return {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

describe("geolocation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("maps geolocation error codes", () => {
    expect(
      mapGeolocationError(createGeolocationError(1, "denied")),
    ).toBe("Location permission denied");
    expect(
      mapGeolocationError(createGeolocationError(2, "unavailable")),
    ).toBe("Location unavailable");
    expect(
      mapGeolocationError(createGeolocationError(3, "timeout")),
    ).toBe("Location request timed out");
  });

  it("formats accuracy and detects low readings", () => {
    expect(formatAccuracyMeters(42.4)).toBe("±42 m");
    expect(isLowGpsAccuracy(600)).toBe(true);
    expect(isLowGpsAccuracy(120)).toBe(false);
  });

  it("resolves early when accuracy is within target", async () => {
    const clearWatch = vi.fn();
    let watchSuccess: PositionCallback | null = null;

    const geolocation = {
      watchPosition: vi.fn((success, _error, options) => {
        watchSuccess = success;
        expect(options).toEqual(PRECISE_GEOLOCATION_OPTIONS);
        return 7;
      }),
      clearWatch,
      getCurrentPosition: vi.fn(),
    } as unknown as Geolocation;

    const promise = getPrecisePosition(geolocation, 10_000, 50);
    watchSuccess?.(createPosition(48.85, 2.35, 40));

    await expect(promise).resolves.toEqual({
      latitude: 48.85,
      longitude: 2.35,
      accuracy: 40,
    });
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it("returns the most accurate reading after refine window", async () => {
    const clearWatch = vi.fn();
    let watchSuccess: PositionCallback | null = null;

    const geolocation = {
      watchPosition: vi.fn((success) => {
        watchSuccess = success;
        return 3;
      }),
      clearWatch,
      getCurrentPosition: vi.fn(),
    } as unknown as Geolocation;

    const promise = getPrecisePosition(geolocation, 10_000, 50);
    watchSuccess?.(createPosition(48.85, 2.35, 180));
    watchSuccess?.(createPosition(48.86, 2.36, 90));

    await vi.advanceTimersByTimeAsync(10_000);

    await expect(promise).resolves.toEqual({
      latitude: 48.86,
      longitude: 2.36,
      accuracy: 90,
    });
    expect(clearWatch).toHaveBeenCalledWith(3);
  });

  it("falls back to getCurrentPosition when watch fails", async () => {
    const clearWatch = vi.fn();
    let watchError: PositionErrorCallback | null = null;

    const geolocation = {
      watchPosition: vi.fn((_success, error) => {
        watchError = error;
        return 5;
      }),
      clearWatch,
      getCurrentPosition: vi.fn((success) => {
        success(createPosition(33.57, -7.58, 25));
      }),
    } as unknown as Geolocation;

    const promise = getPrecisePosition(geolocation);
    watchError?.(createGeolocationError(2, "unavailable"));

    await expect(promise).resolves.toEqual({
      latitude: 33.57,
      longitude: -7.58,
      accuracy: 25,
    });
    expect(clearWatch).toHaveBeenCalledWith(5);
  });
});
