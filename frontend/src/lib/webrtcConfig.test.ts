import { describe, expect, it } from "vitest";
import { RTC_PEER_CONFIG } from "./webrtcConfig";

describe("webrtcConfig", () => {
  it("includes a public STUN server", () => {
    expect(RTC_PEER_CONFIG.iceServers).toBeDefined();
    expect(RTC_PEER_CONFIG.iceServers?.length).toBeGreaterThan(0);
    expect(RTC_PEER_CONFIG.iceServers?.[0]).toEqual({
      urls: "stun:stun.l.google.com:19302",
    });
  });
});
