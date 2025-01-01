import { appAPI } from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

import { PasswordResetRequest, APIError } from "@/types/auth";
import { useToast } from "../use-toast";

export function useForgotPassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      const response =
        await appAPI.api.forgotPasswordApiAuthForgotPasswordPost(data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Check your email",
        description: "We've sent you a password reset link",
      });
    },
    onError: (error: APIError) => {
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description:
          error?.response?.data?.detail || "Failed to send reset link",
      });
    },
  });
}
