import { describe, expect, it } from "vitest";
import { uniqueStrings } from "./uniqueStrings";

describe("uniqueStrings", () => {
  it("removes duplicate values while preserving order", () => {
    expect(uniqueStrings(["Animals", "Music", "Animals"])).toEqual([
      "Animals",
      "Music",
    ]);
  });
});
