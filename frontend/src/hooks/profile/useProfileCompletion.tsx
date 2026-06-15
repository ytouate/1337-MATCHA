import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

interface Options {
  redirectIfComplete?: boolean;
  redirectIfIncomplete?: boolean;
}

export const useProfileCompletion = (options: Options = {}) => {
  const { redirectIfComplete = false, redirectIfIncomplete = false } = options;
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    if (redirectIfComplete && user.is_profile_completed) {
      router.replace("/");
      return;
    }

    if (redirectIfIncomplete && !user.is_profile_completed) {
      router.replace("/complete-profile");
    }
  }, [user, router, redirectIfComplete, redirectIfIncomplete]);

  return {
    isProfileCompleted: user?.is_profile_completed ?? false,
  };
};
