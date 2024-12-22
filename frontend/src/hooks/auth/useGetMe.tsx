import { useQuery } from "@tanstack/react-query";
import { appAPI } from "@/utils/axios";
import { AuthTypes } from "@/types";

export const useGetMe = () => {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await appAPI.auth.getMeAuthMeGet();
      return response.data as AuthTypes.User;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};
