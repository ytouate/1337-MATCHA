import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import axios from "axios";
import { appAPI } from "@/utils/axios";
import { SignInData } from "@/models";
import { useToast } from "../use-toast";

interface SignInResponse {
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
  };
}

export const useSignin = (onSuccessCallback?: () => void) => {
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignInData) => {
      const response = await appAPI.auth.signinAuthSigninPost(data);
      return response.data as SignInResponse;
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast({
        variant: "success",
        title: "Welcome back!",
        duration: 2000,
        description: "You have successfully signed in.",
      });

      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error) => {
      const responseErrorMessage =
        axios.isAxiosError(error) && error.response?.data.error
          ? error.response.data.error
          : "There was a problem signing you in, please try again!";
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: responseErrorMessage,
        duration: 2000,
      });
    },
  });
};
