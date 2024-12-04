"use client";
import React, { FC, useState } from "react";
import { Hero } from "@/components/Leading/Hero";
import { Signup } from "@/components/auth/Signup";
import { Navbar } from "@/components/Leading/Navbar";
import { Signin } from "@/components/auth/Signin";
import { Modal } from "@/components/common/Modal";
import { EmailConfirmationModal } from "@/components/auth/EmailConfirmationModal";

const LeadingPage: FC = () => {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [signinModalOpen, setSigninModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  return (
    <div className="h-screen max-w-[1550px] m-auto">
      <Navbar setSigninModalOpen={setSigninModalOpen} />
      <Hero setSignupModalOpen={setSignupModalOpen} />
      <Modal
        modalOpen={showSuccessToast || signupModalOpen || signinModalOpen}
        setModalOpen={
          signinModalOpen
            ? setSigninModalOpen
            : signupModalOpen
              ? setSignupModalOpen
              : setShowSuccessToast
        }
      >
        {showSuccessToast && (
          <EmailConfirmationModal setOpen={setShowSuccessToast} />
        )}
        {signinModalOpen && <Signin setSigninModalOpen={setSigninModalOpen} />}
        {signupModalOpen && (
          <Signup
            setSignupModalOpen={setSignupModalOpen}
            setShowSuccessToast={setShowSuccessToast}
          />
        )}
      </Modal>
    </div>
  );
};

export default LeadingPage;
