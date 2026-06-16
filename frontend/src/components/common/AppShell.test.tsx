import { AppShell } from "@/components/common/AppShell";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/contexts/AuthModalContext", () => ({
  useAuthModal: () => ({
    signinOpen: false,
    signupOpen: false,
    forgotPasswordOpen: false,
    emailConfirmationOpen: false,
    setSigninOpen: vi.fn(),
    setSignupOpen: vi.fn(),
    setForgotPasswordOpen: vi.fn(),
    setEmailConfirmationOpen: vi.fn(),
    openForgotPassword: vi.fn(),
  }),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: {
      username: "alice",
      first_name: "Alice",
      last_name: "Smith",
      profile_picture: null,
    },
  }),
}));

vi.mock("@/hooks/auth/useSignout", () => ({
  useSignout: () => ({ mutate: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/components/common/NotificationBell", () => ({
  NotificationBell: () => <div>Notifications</div>,
}));

vi.mock("@/components/auth/Signin", () => ({
  Signin: () => null,
}));
vi.mock("@/components/auth/Signup", () => ({
  Signup: () => null,
}));
vi.mock("@/components/auth/ForgotPassword", () => ({
  ForgotPassword: () => null,
}));
vi.mock("@/components/auth/EmailConfirmationModal", () => ({
  EmailConfirmationModal: () => null,
}));

describe("AppShell", () => {
  it("renders navbar with logout on every page", () => {
    render(
      <AppShell>
        <div>Page content</div>
      </AppShell>,
    );

    expect(screen.getByText("MATCHA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
