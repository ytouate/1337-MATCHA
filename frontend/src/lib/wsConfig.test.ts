import { describe, expect, it } from "vitest";
import { getWsApiUrl } from "./wsConfig";

describe("getWsApiUrl", () => {
  it("builds the websocket URL from the API base", () => {
    expect(getWsApiUrl()).toBe("ws://localhost:7001/api/ws");
  });
});
