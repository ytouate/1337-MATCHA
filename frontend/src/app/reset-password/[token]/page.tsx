"use client";

import { use } from "react";
import { useValidateResetToken } from "@/hooks/auth/useValidateResetToken";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  useValidateResetToken(token);

  return null;
}
