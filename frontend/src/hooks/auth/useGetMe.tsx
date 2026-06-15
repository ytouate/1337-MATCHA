import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/client";
import { AuthTypes } from "@/types";

export const useGetMe = () => {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      return (await authApi.getMeApiAuthMeGet()) as AuthTypes.User;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};
