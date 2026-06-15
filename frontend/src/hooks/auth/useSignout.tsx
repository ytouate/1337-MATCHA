import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { authApi } from "@/api/client";
import { useToast } from "../use-toast";

export const useSignout = () => {
  const { logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearSession = () => {
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    logout();
    router.replace("/");
  };

  return useMutation({
    mutationFn: async () => {
      return authApi.signoutApiAuthSignoutPost();
    },
    onSuccess: () => {
      clearSession();
      toast({
        variant: "success",
        title: "Success",
        description: "Successfully logged out",
      });
    },
    onError: () => {
      clearSession();
      toast({
        variant: "success",
        title: "Logged out",
        description: "Your local session was cleared.",
      });
    },
  });
};
