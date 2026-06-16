import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./useGeolocation";

vi.mock("@/lib/geolocation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/geolocation")>();
  return {
    ...actual,
    getPrecisePosition: vi.fn(),
  };
});

import { getPrecisePosition } from "@/lib/geolocation";

describe("useGeolocation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores precise coordinates and accuracy on success", async () => {
    vi.mocked(getPrecisePosition).mockResolvedValue({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 35,
    });

    const geolocation = {
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn(),
    };
    Object.defineProperty(globalThis.navigator, "geolocation", {
      configurable: true,
      value: geolocation,
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestPreciseLocation();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.latitude).toBe(48.8566);
    expect(result.current.longitude).toBe(2.3522);
    expect(result.current.accuracy).toBe(35);
    expect(result.current.error).toBeNull();
  });

  it("surfaces permission errors", async () => {
    vi.mocked(getPrecisePosition).mockRejectedValue({
      code: 1,
      message: "denied",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });

    Object.defineProperty(globalThis.navigator, "geolocation", {
      configurable: true,
      value: {},
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestPreciseLocation();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Location permission denied");
    expect(result.current.latitude).toBeNull();
  });
});
