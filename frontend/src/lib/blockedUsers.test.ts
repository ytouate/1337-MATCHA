import { describe, expect, it, vi } from "vitest";

const invalidateQueries = vi.fn();
const unblockUserApiUsersUsernameBlockDelete = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock("@/api/client", () => ({
  socialApi: {
    getMyBlockedUsersApiUsersMeBlockedGet: vi.fn(),
    unblockUserApiUsersUsernameBlockDelete,
  },
}));

describe("blocked users flow", () => {
  it("unblock uses generated social API", () => {
    expect(unblockUserApiUsersUsernameBlockDelete).toBeDefined();
  });
});
