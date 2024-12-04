import { useMutation } from "@tanstack/react-query";
import { useToast } from "../use-toast";
import axios from "axios";
import { SignupData } from "@/models";
import { appAPI } from "@/utils/axios";

export const useSignup = (onSuccessCallback?: () => void) => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SignupData) => {
      return await appAPI.auth.signupAuthSignupPost(data);
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
        axios.isAxiosError(error) && error.response?.data.message
          ? error.response.data.message
          : "There was a problem signing you up, please try again!";
      toast({
        variant: "error",
        title: "Uh oh! Something went wrong.",
        description: responseErrorMessage,
        duration: 2000,
      });
    },
    onSettled: () => {},
  });
};
