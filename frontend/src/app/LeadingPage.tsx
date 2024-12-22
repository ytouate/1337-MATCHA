"use client";
import React, { FC, useState } from "react";
import { Hero } from "@/components/Leading/Hero";
import { Signup } from "@/components/auth/Signup";
import { Navbar } from "@/components/Leading/Navbar";
import { Signin } from "@/components/auth/Signin";
import { EmailConfirmationModal } from "@/components/auth/EmailConfirmationModal";
import { useAuthStore } from "@/store/auth";
import { useGetMe } from "@/hooks/auth/useGetMe";
import { Loader2 } from "lucide-react";
import { ForgotPassword } from "@/components/auth/ForgotPassword";

const LeadingPage: FC = () => {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [signinModalOpen, setSigninModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { isLoading } = useGetMe();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen max-w-[1550px] m-auto">
      <Navbar setSigninModalOpen={setSigninModalOpen} />
      {!isAuthenticated && <Hero setSignupModalOpen={setSignupModalOpen} />}

      <EmailConfirmationModal
        isOpen={showSuccessToast}
        onOpenChange={setShowSuccessToast}
      />

      <Signin
        isOpen={signinModalOpen}
        onOpenChange={setSigninModalOpen}
        onForgotPassword={() => {
          setSigninModalOpen(false);
          setShowForgotPassword(true);
        }}
      />

      <Signup
        isOpen={signupModalOpen}
        onOpenChange={setSignupModalOpen}
        onSuccess={() => {
          setShowSuccessToast(true);
        }}
      />

      <ForgotPassword
        isOpen={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
};

export default LeadingPage;
