import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useDateMutations } from "./useDates";

import type { DateProposalResponse } from "@/api/model";

const mocks = vi.hoisted(() => ({
  acceptDateProposalApiDatesDateIdAcceptPost: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  datesApi: {
    acceptDateProposalApiDatesDateIdAcceptPost:
      mocks.acceptDateProposalApiDatesDateIdAcceptPost,
    declineDateProposalApiDatesDateIdDeclinePost: vi.fn(),
    cancelDateProposalApiDatesDateIdCancelPost: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
    }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useDateMutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates date queries after accept", async () => {
    mocks.acceptDateProposalApiDatesDateIdAcceptPost.mockResolvedValue({ id: 7 });

    const { result } = renderHook(() => useDateMutations(), { wrapper });

    await act(async () => {
      await result.current.acceptMutation.mutateAsync(7);
    });

    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["dates"],
      });
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["dates", 7],
      });
    });
  });
});

function makeDate(
  overrides: Partial<DateProposalResponse> = {},
): DateProposalResponse {
  return {
    id: 1,
    status: "proposed",
    scheduled_at: "2026-06-20T18:30:00",
    is_mine: false,
    peer: {
      username: "peer",
      first_name: "Peer",
      last_name: "User",
    },
    created_at: "2026-06-01T12:00:00",
    updated_at: "2026-06-01T12:00:00",
    ...overrides,
  };
}

describe("date helpers", () => {
  it("identifies pending invites", async () => {
    const { isPendingInvite } = await import("./useDates");
    expect(isPendingInvite(makeDate({ status: "proposed", is_mine: false }))).toBe(
      true,
    );
    expect(isPendingInvite(makeDate({ status: "proposed", is_mine: true }))).toBe(
      false,
    );
  });

  it("identifies sent pending proposals", async () => {
    const { isPendingSent } = await import("./useDates");
    expect(isPendingSent(makeDate({ status: "proposed", is_mine: true }))).toBe(
      true,
    );
    expect(isPendingSent(makeDate({ status: "proposed", is_mine: false }))).toBe(
      false,
    );
    expect(isPendingSent(makeDate({ status: "accepted", is_mine: true }))).toBe(
      false,
    );
  });
});
