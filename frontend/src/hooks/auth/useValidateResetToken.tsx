import { useQuery } from "@tanstack/react-query";
import { appAPI } from "@/utils/axios";
import { useRouter } from "next/navigation";

export const useValidateResetToken = (token: string) => {
  const router = useRouter();

  return useQuery({
    queryKey: ["validateResetToken", token],
    queryFn: async () => {
      try {
        await appAPI.auth.validateResetTokenAuthValidateResetTokenTokenGet(
          token
        );
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
