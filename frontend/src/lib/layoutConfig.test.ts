import { describe, expect, it } from "vitest";
import {
  SHELL_FOOTER_HEIGHT,
  SHELL_HEADER_OFFSET,
  SHELL_MAIN_HEIGHT,
} from "./layoutConfig";

describe("layoutConfig", () => {
  it("defines shell layout height constants", () => {
    expect(SHELL_HEADER_OFFSET).toContain("4rem");
    expect(SHELL_FOOTER_HEIGHT).toBe("3rem");
    expect(SHELL_MAIN_HEIGHT).toContain(SHELL_HEADER_OFFSET);
    expect(SHELL_MAIN_HEIGHT).toContain(SHELL_FOOTER_HEIGHT);
  });
});
