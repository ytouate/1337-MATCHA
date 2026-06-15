import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { useSignout } from "@/hooks/auth/useSignout";

const logout = vi.fn();
const replace = vi.fn();
const toast = vi.fn();
const invalidateQueries = vi.fn();
const signoutApi = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({ logout }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@/api/client", () => ({
  authApi: {
    signoutApiAuthSignoutPost: (...args: unknown[]) => signoutApi(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.invalidateQueries = invalidateQueries;

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useSignout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears local session after successful signout", async () => {
    signoutApi.mockResolvedValue({ message: "Successfully signed out" });

    const { result } = renderHook(() => useSignout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signoutApi).toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
    expect(logout).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("clears local session even when signout API fails", async () => {
    signoutApi.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useSignout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(logout).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
