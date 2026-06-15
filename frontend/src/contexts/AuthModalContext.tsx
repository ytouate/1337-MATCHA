"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthModalContextValue = {
  signinOpen: boolean;
  signupOpen: boolean;
  forgotPasswordOpen: boolean;
  emailConfirmationOpen: boolean;
  openSignin: () => void;
  openSignup: () => void;
  openForgotPassword: () => void;
  setSigninOpen: (open: boolean) => void;
  setSignupOpen: (open: boolean) => void;
  setForgotPasswordOpen: (open: boolean) => void;
  setEmailConfirmationOpen: (open: boolean) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [signinOpen, setSigninOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [emailConfirmationOpen, setEmailConfirmationOpen] = useState(false);

  const openSignin = useCallback(() => setSigninOpen(true), []);
  const openSignup = useCallback(() => setSignupOpen(true), []);
  const openForgotPassword = useCallback(() => setForgotPasswordOpen(true), []);

  const value = useMemo(
    () => ({
      signinOpen,
      signupOpen,
      forgotPasswordOpen,
      emailConfirmationOpen,
      openSignin,
      openSignup,
      openForgotPassword,
      setSigninOpen,
      setSignupOpen,
      setForgotPasswordOpen,
      setEmailConfirmationOpen,
    }),
    [
      signinOpen,
      signupOpen,
      forgotPasswordOpen,
      emailConfirmationOpen,
      openSignin,
      openSignup,
      openForgotPassword,
    ]
  );

  return (
    <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}
