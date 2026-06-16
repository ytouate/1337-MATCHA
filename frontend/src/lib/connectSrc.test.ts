import { describe, expect, it } from "vitest";
import { buildConnectSrcDirective, buildConnectSrcSources } from "./connectSrc";

describe("buildConnectSrcSources", () => {
  it("includes self, API, and frontend websocket origins", () => {
    const sources = buildConnectSrcSources({
      apiBase: "http://localhost:7001",
      appBase: "http://localhost:9998",
    });

    expect(sources).toContain("'self'");
    expect(sources).toContain("http://localhost:7001");
    expect(sources).toContain("ws://localhost:7001");
    expect(sources).toContain("ws://localhost:9998");
    expect(sources).toContain("wss://localhost:9998");
  });

  it("adds localhost and 127.0.0.1 variants in development", () => {
    const sources = buildConnectSrcSources({
      apiBase: "http://localhost:7001",
      appBase: "http://localhost:9998",
      includeLocalhostVariants: true,
    });

    expect(sources).toContain("ws://127.0.0.1:9998");
    expect(sources).toContain("ws://127.0.0.1:7001");
  });

  it("builds a strict connect-src directive in production", () => {
    expect(
      buildConnectSrcDirective({
        apiBase: "http://localhost:7001",
        appBase: "http://localhost:9998",
      }),
    ).toMatch(/^connect-src 'self'/);
  });

  it("uses relaxed scheme sources in development", () => {
    expect(
      buildConnectSrcDirective({
        apiBase: "http://localhost:7001",
        appBase: "http://localhost:9998",
        devMode: true,
      }),
    ).toBe("connect-src 'self' http: https: ws: wss: blob: data:");
  });
});
