import { describe, expect, it } from "vitest";
import { formatApiError, sanitizeDisplayMessage } from "./apiErrors";
import { AxiosError } from "axios";

describe("apiErrors", () => {
  it("sanitizes technical messages", () => {
    expect(sanitizeDisplayMessage("Traceback (most recent call last)")).toBe(
      "Something went wrong. Please try again.",
    );
    expect(sanitizeDisplayMessage("Invalid credentials")).toBe(
      "Invalid credentials",
    );
  });

  it("formats string detail from axios errors", () => {
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config: {} as never,
        data: { detail: "Invalid credentials" },
      },
    );

    expect(formatApiError(error)).toBe("Invalid credentials");
  });

  it("formats validation error arrays", () => {
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config: {} as never,
        data: {
          detail: [{ msg: "Field required" }, { msg: "Invalid email" }],
        },
      },
    );

    expect(formatApiError(error)).toBe("Field required. Invalid email");
  });

  it("returns network message when offline", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK");
    expect(formatApiError(error)).toBe(
      "Network error. Check your connection and try again.",
    );
  });
});
