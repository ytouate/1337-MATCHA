import { useMutation } from "@tanstack/react-query";
import { useToast } from "../use-toast";
import { isAxiosError } from "axios";
import type { SignupData } from "@/api/model";
import { authApi } from "@/api/client";

export const useSignup = (onSuccessCallback?: () => void) => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SignupData) => {
      return authApi.signupApiAuthSignupPost(data);
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Success!",
        duration: 2000,
        description: "You have successfully signed up. Welcome aboard!",
      });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error) => {
      const responseErrorMessage =
        isAxiosError(error) && error.response?.data?.detail
          ? String(error.response.data.detail)
          : isAxiosError(error) && error.response?.data?.message
            ? String(error.response.data.message)
            : "There was a problem signing you up, please try again!";
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: responseErrorMessage,
        duration: 2000,
      });
    },
  });
};
