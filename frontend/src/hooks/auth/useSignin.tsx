import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

import { SignInResponse, APIError } from "@/types/auth";
import { appAPI } from "@/utils/axios";
import { useToast } from "../use-toast";
import { SignInData } from "@/models";

export const useSignin = (onSuccessCallback?: () => void) => {
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: SignInData) => {
      const response = await appAPI.api.signinApiAuthSigninPost(data);
      return response.data as SignInResponse;
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
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description:
          error?.response?.data?.detail ||
          "There was a problem signing you in, please try again!",
        duration: 2000,
      });
    },
  });
};
