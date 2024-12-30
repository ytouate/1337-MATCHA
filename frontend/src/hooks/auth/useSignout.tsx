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
      const response = await appAPI.auth.signoutAuthSignoutPost();
      return response.data;
    },
    onSuccess: () => {
      logout();
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/");
      toast({
        variant: "success",
        title: "Success",
        description: "Successfully logged out",
      });
    },
    onError: () => {
      toast({
        variant: "error",
        title: "Error",
        description: "Something went wrong",
      });
    },
  });
};
