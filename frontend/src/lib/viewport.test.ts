import { appViewport } from "@/lib/viewport";
import { describe, expect, it } from "vitest";

describe("viewport", () => {
  it("uses a mobile-friendly viewport configuration", () => {
    expect(appViewport).toEqual({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
    });
  });
});
