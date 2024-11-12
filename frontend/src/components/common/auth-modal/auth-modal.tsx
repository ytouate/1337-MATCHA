import React, { FC } from "react";
import { AuthTypes } from "@/types";
import "./auth-modal.scss";

const AuthModal: FC<AuthTypes.AuthModalProps> = ({
    children,
    onClose,
}) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg border border-gray-200 md:max-w-lg">
        {children}

    </div>
  );
};
