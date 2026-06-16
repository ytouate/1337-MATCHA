import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRealtimePollInterval } from "./useRealtimePollInterval";

vi.mock("@/contexts/ChatSocketContext", () => ({
  useChatSocket: vi.fn(),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: vi.fn(),
}));

import { useChatSocket } from "@/contexts/ChatSocketContext";
import { useAuthStore } from "@/store/auth";

describe("useRealtimePollInterval", () => {
  it("polls only when authenticated and websocket is disconnected", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
    vi.mocked(useChatSocket).mockReturnValue({
      isConnected: false,
    } as ReturnType<typeof useChatSocket>);

    const { result, rerender } = renderHook(() => useRealtimePollInterval());
    expect(result.current).toBe(8000);

    vi.mocked(useChatSocket).mockReturnValue({
      isConnected: true,
    } as ReturnType<typeof useChatSocket>);
    rerender();
    expect(result.current).toBe(false);
  });

  it("does not poll when unauthenticated", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
    } as ReturnType<typeof useAuthStore>);
    vi.mocked(useChatSocket).mockReturnValue({
      isConnected: false,
    } as ReturnType<typeof useChatSocket>);

    const { result } = renderHook(() => useRealtimePollInterval());
    expect(result.current).toBe(false);
  });
});
