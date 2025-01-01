import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { appAPI } from "@/utils/axios";
import { useToast } from "../use-toast";

export const useSignout = () => {
  const { logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await appAPI.api.signoutApiAuthSignoutPost();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      logout();

      toast({
        variant: "success",
        title: "Success",
        description: "Successfully logged out",
      });

      router.replace("/");
    },
    onError: () => {
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to logout. Please try again.",
      });
    },
  });
};
