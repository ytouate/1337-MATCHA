import { useMutation } from "@tanstack/react-query";
import { useToast } from "../use-toast";
import type { SignupData } from "@/api/model";
import { authApi } from "@/api/client";
import { formatApiError } from "@/lib/apiErrors";

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
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: formatApiError(
          error,
          "There was a problem signing you up, please try again!",
        ),
        duration: 2000,
      });
    },
  });
};
