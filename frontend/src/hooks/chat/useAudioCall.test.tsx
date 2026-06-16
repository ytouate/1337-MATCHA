import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AudioCallProvider, useAudioCall } from "./useAudioCall";

const sendCallSignal = vi.fn().mockResolvedValue(undefined);
let callHandler: ((event: string, data: unknown) => void) | null = null;

vi.mock("@/contexts/ChatSocketContext", () => ({
  useChatSocket: () => ({
    sendCallSignal,
    subscribeCall: (handler: (event: string, data: unknown) => void) => {
      callHandler = handler;
      return () => {
        callHandler = null;
      };
    },
  }),
}));

vi.mock("@/lib/audioCall", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audioCall")>();
  return {
    ...actual,
    createCallId: () => "test-call-id",
  };
});

class MockRTCPeerConnection {
  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null =
    null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  connectionState: RTCPeerConnectionState = "new";

  addTrack = vi.fn();
  close = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "offer-sdp" });
  createAnswer = vi.fn().mockResolvedValue({ type: "answer", sdp: "answer-sdp" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
}

function wrapper({ children }: { children: ReactNode }) {
  return <AudioCallProvider>{children}</AudioCallProvider>;
}

describe("useAudioCall", () => {
  beforeEach(() => {
    sendCallSignal.mockClear();
    callHandler = null;

    const audioTrack = {
      enabled: true,
      stop: vi.fn(),
    };
    const stream = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
    };

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    vi.stubGlobal("RTCPeerConnection", MockRTCPeerConnection);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts an outgoing call and sends invite", async () => {
    const { result } = renderHook(() => useAudioCall(), { wrapper });

    await act(async () => {
      await result.current.startCall("bob");
    });

    expect(result.current.status).toBe("outgoing");
    expect(result.current.peerUsername).toBe("bob");
    expect(result.current.callId).toBe("test-call-id");
    expect(sendCallSignal).toHaveBeenCalledWith("call.invite", {
      username: "bob",
      call_id: "test-call-id",
    });
  });

  it("transitions to incoming on call.incoming event", async () => {
    const { result } = renderHook(() => useAudioCall(), { wrapper });

    act(() => {
      callHandler?.("call.incoming", {
        call_id: "incoming-id",
        from_username: "alice",
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("incoming");
    });
    expect(result.current.peerUsername).toBe("alice");
    expect(result.current.callId).toBe("incoming-id");
  });

  it("sends offer after call.accepted when outgoing", async () => {
    const { result } = renderHook(() => useAudioCall(), { wrapper });

    await act(async () => {
      await result.current.startCall("bob");
    });

    await act(async () => {
      callHandler?.("call.accepted", {
        call_id: "test-call-id",
        from_username: "bob",
      });
    });

    await waitFor(() => {
      expect(sendCallSignal).toHaveBeenCalledWith("call.offer", {
        username: "bob",
        call_id: "test-call-id",
        sdp: { type: "offer", sdp: "offer-sdp" },
      });
    });
  });

  it("accepts an incoming call and sends accept signal", async () => {
    const { result } = renderHook(() => useAudioCall(), { wrapper });

    act(() => {
      callHandler?.("call.incoming", {
        call_id: "incoming-id",
        from_username: "alice",
      });
    });

    await act(async () => {
      await result.current.acceptCall();
    });

    expect(sendCallSignal).toHaveBeenCalledWith("call.accept", {
      username: "alice",
      call_id: "incoming-id",
    });
  });

  it("rejects call and resets to idle", async () => {
    const { result } = renderHook(() => useAudioCall(), { wrapper });

    act(() => {
      callHandler?.("call.incoming", {
        call_id: "incoming-id",
        from_username: "alice",
      });
    });

    await act(async () => {
      await result.current.rejectCall();
    });

    expect(sendCallSignal).toHaveBeenCalledWith("call.reject", {
      username: "alice",
      call_id: "incoming-id",
    });
    expect(result.current.status).toBe("idle");
  });
});
