import { describe, expect, it, vi } from "vitest";
import { RTC_PEER_CONFIG, isWebRtcSupported } from "./webrtcConfig";

describe("webrtcConfig", () => {
  it("includes a public STUN server", () => {
    expect(RTC_PEER_CONFIG.iceServers).toBeDefined();
    expect(RTC_PEER_CONFIG.iceServers?.length).toBeGreaterThan(0);
    expect(RTC_PEER_CONFIG.iceServers?.[0]).toEqual({
      urls: "stun:stun.l.google.com:19302",
    });
  });

  it("detects WebRTC support when APIs are available", () => {
    vi.stubGlobal("RTCPeerConnection", class {});
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });

    expect(isWebRtcSupported()).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns false when WebRTC APIs are missing", () => {
    vi.stubGlobal("RTCPeerConnection", undefined);
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });

    expect(isWebRtcSupported()).toBe(false);
    vi.unstubAllGlobals();
  });
});
