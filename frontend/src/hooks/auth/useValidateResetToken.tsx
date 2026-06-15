import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/client";
import { useRouter } from "next/navigation";

export const useValidateResetToken = (token: string) => {
  const router = useRouter();

  return useQuery({
    queryKey: ["validateResetToken", token],
    queryFn: async () => {
      try {
        await authApi.validateResetTokenApiAuthValidateResetTokenTokenGet(token);
        router.push(`/reset-password/form?token=${token}`);
        return true;
      } catch (error) {
        router.push("/");
        throw error;
      }
    },
    retry: false,
    enabled: !!token,
  });
};
