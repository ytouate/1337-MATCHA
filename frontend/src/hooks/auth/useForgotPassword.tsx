import { appAPI } from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../use-toast";

interface ForgotPasswordData {
  email: string;
}

export const useForgotPassword = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response =
        await appAPI.auth.forgotPasswordAuthForgotPasswordPost(data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Check your email",
        description: "We've sent you a password reset link",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description:
          error?.response?.data?.error || "Failed to send reset link",
      });
    },
  });
};
