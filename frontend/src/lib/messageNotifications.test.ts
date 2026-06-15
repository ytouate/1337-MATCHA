import { describe, expect, it } from "vitest";
import {
  getActiveChatUsername,
  shouldNotifyMessage,
} from "./messageNotifications";

describe("messageNotifications", () => {
  it("parses active chat username from pathname", () => {
    expect(getActiveChatUsername("/chat/alice")).toBe("alice");
    expect(getActiveChatUsername("/chat/bob%20x")).toBe("bob x");
    expect(getActiveChatUsername("/chat")).toBeNull();
    expect(getActiveChatUsername("/notifications")).toBeNull();
  });

  it("suppresses notification when viewing the sender thread", () => {
    expect(shouldNotifyMessage("/chat/alice", "alice")).toBe(false);
    expect(shouldNotifyMessage("/chat/bob", "alice")).toBe(true);
    expect(shouldNotifyMessage("/", "alice")).toBe(true);
  });
});
