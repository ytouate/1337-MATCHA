"use client";
import React, { FC, useState } from "react";
import { Hero } from "@/components/Leading/Hero";
import { Signup } from "@/components/auth/Signup";
import { Navbar } from "@/components/Leading/Navbar";
import { Signin } from "@/components/auth/Signin";
import { FormsModal } from "@/components/common/Modal";

const LeadingPage: FC = () => {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [signinModalOpen, setSigninModalOpen] = useState(false);
  return (
    <div className="h-screen max-w-[1550px] m-auto">
      <Navbar setSigninModalOpen={setSigninModalOpen} />
      <Hero setSignupModalOpen={setSignupModalOpen} />
      <FormsModal
        signupModalOpen={signupModalOpen}
        setSignupModalOpen={setSignupModalOpen}
        setSigninModalOpen={setSigninModalOpen}
        signinModalOpen={signinModalOpen}
      >
        {signinModalOpen && <Signin setSigninModalOpen={setSigninModalOpen} />}
        {signupModalOpen && <Signup setSignupModalOpen={setSignupModalOpen} />}
      </FormsModal>
    </div>
  );
};

export default LeadingPage;
