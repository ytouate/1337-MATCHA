"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/leading/Navbar";
import { Signin } from "@/components/auth/Signin";
import { Signup } from "@/components/auth/Signup";
import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { EmailConfirmationModal } from "@/components/auth/EmailConfirmationModal";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useToast } from "@/hooks/use-toast";

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
    <>
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Suspense fallback={null}>
        <VerifiedRedirectHandler />
      </Suspense>
      <AuthModals />
    </>
  );
}
