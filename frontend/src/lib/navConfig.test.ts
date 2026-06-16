import { describe, expect, it } from "vitest";
import { isNavItemActive, getActiveNavHref, discoverNav } from "./navConfig";

describe("navConfig", () => {
  it("matches root search exactly", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/map", "/")).toBe(false);
  });

  it("matches chat threads under chat prefix", () => {
    expect(isNavItemActive("/chat/alice", "/chat")).toBe(true);
    expect(isNavItemActive("/connections", "/chat")).toBe(false);
  });

  it("matches nested routes by prefix", () => {
    expect(isNavItemActive("/profile/me/blocked", "/profile/me/blocked")).toBe(
      true,
    );
    expect(isNavItemActive("/dates/5", "/dates")).toBe(true);
  });

  it("finds active href from groups", () => {
    expect(getActiveNavHref("/map", [discoverNav])).toBe("/map");
    expect(getActiveNavHref("/unknown", [discoverNav])).toBeNull();
  });
});
