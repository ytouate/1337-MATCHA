import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export const useProfileCompletion = () => {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.is_profile_completed) {
      router.replace("/complete-profile");
    }
  }, [user, router]);

  return {
    isProfileCompleted: user?.is_profile_completed ?? false,
  };
};
