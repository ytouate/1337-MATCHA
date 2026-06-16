"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/leading/Navbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SHELL_HEADER_OFFSET } from "@/lib/layoutConfig";
import { Signin } from "@/components/auth/Signin";
import { Signup } from "@/components/auth/Signup";
import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { EmailConfirmationModal } from "@/components/auth/EmailConfirmationModal";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeDisplayMessage } from "@/lib/apiErrors";

function VerifiedRedirectHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams?.get("verified") === "1") {
      toast({
        variant: "success",
        title: "Email verified",
        description: "Your account is verified. You can now log in.",
      });
      router.replace("/");
      return;
    }

    const oauthError = searchParams?.get("oauth_error");
    if (oauthError) {
      toast({
        variant: "error",
        title: "42 sign in failed",
        description: sanitizeDisplayMessage(decodeURIComponent(oauthError)),
      });
      router.replace("/");
    }
  }, [searchParams, router, toast]);

  return null;
}

function AuthModals() {
  const {
    signinOpen,
    signupOpen,
    forgotPasswordOpen,
    emailConfirmationOpen,
    setSigninOpen,
    setSignupOpen,
    setForgotPasswordOpen,
    setEmailConfirmationOpen,
    openForgotPassword,
  } = useAuthModal();

  return (
    <>
      <EmailConfirmationModal
        isOpen={emailConfirmationOpen}
        onOpenChange={setEmailConfirmationOpen}
      />

      <Signin
        isOpen={signinOpen}
        onOpenChange={setSigninOpen}
        onForgotPassword={() => {
          setSigninOpen(false);
          openForgotPassword();
        }}
      />

      <Signup
        isOpen={signupOpen}
        onOpenChange={setSignupOpen}
        onSuccess={() => {
          setEmailConfirmationOpen(true);
        }}
      />

      <ForgotPassword
        isOpen={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: SHELL_HEADER_OFFSET }}
      >
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={null}>
        <VerifiedRedirectHandler />
      </Suspense>
      <AuthModals />
    </div>
  );
}
