import { describe, expect, it } from "vitest";
import {
  formatScheduledAt,
  getDateStatusLabel,
  getPeerDisplayName,
  getSentDateStatusLabel,
} from "./datePresentation";

describe("datePresentation", () => {
  it("formats scheduled datetime", () => {
    const formatted = formatScheduledAt("2026-06-20T18:30:00");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("6");
  });

  it("maps status labels", () => {
    expect(getDateStatusLabel("proposed")).toBe("Pending");
    expect(getDateStatusLabel("accepted")).toBe("Confirmed");
    expect(getDateStatusLabel("declined")).toBe("Declined");
    expect(getDateStatusLabel("cancelled")).toBe("Cancelled");
    expect(getSentDateStatusLabel()).toBe("Awaiting response");
  });

  it("builds peer display name", () => {
    expect(
      getPeerDisplayName({ first_name: "Alice", last_name: "Smith" }),
    ).toBe("Alice Smith");
  });
});
