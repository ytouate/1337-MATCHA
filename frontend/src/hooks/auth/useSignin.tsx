import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { SignInResponse, APIError } from "@/types/auth";
import { useToast } from "../use-toast";
import type { SignInData } from "@/api/model";
import { authApi } from "@/api/client";

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
    onError: (error: APIError) => {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "There was a problem signing you in, please try again!";
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: message,
        duration: 2000,
      });
    },
  });
};
