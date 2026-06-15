"use client";
import { useAuthStore } from "@/store/auth";
import { AuthenticatedLayout } from "../common/AuthenticatedLayout";

export const AuthenticatedHome = () => {
  const { user } = useAuthStore();

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome, {user?.first_name}!
        </h1>
        <div className="text-lg text-gray-600">
          {!user?.is_profile_completed ? (
            <p>Complete your profile to start matching!</p>
          ) : (
            <p>Start exploring potential matches!</p>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};
