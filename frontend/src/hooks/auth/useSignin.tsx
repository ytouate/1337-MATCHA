import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { SignInResponse } from "@/types/auth";
import { useToast } from "../use-toast";
import type { SignInData } from "@/api/model";
import { authApi } from "@/api/client";
import { formatApiError } from "@/lib/apiErrors";

export const useSignin = (onSuccessCallback?: () => void) => {
  const { setUser } = useAuthStore();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SignInData) => {
      return (await authApi.signinApiAuthSigninPost(data)) as SignInResponse;
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        variant: "success",
        title: "Welcome back!",
        duration: 2000,
        description: "You have successfully signed in.",
      });

      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: formatApiError(
          error,
          "There was a problem signing you in, please try again!",
        ),
        duration: 2000,
      });
    },
  });
};
