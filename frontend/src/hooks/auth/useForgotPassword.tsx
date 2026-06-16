import { authApi } from "@/api/client";
import { useMutation } from "@tanstack/react-query";
import type { PasswordResetRequest } from "@/api/model";
import { useToast } from "../use-toast";
import { formatApiError } from "@/lib/apiErrors";

export function useForgotPassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      return authApi.forgotPasswordApiAuthForgotPasswordPost(data);
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Check your email",
        description: "We've sent you a password reset link",
      });
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: formatApiError(error, "Failed to send reset link"),
      });
    },
  });
}
