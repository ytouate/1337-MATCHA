"use client";

import { useProfileCompletion } from "@/hooks/profile/useProfileCompletion";
import { ProfileForm } from "@/components/profile/ProfileForm";
import AuthenticatedLayout from "@/components/common/AuthenticatedLayout";

export default function CompleteProfilePage() {
  useProfileCompletion();

  return (
    <AuthenticatedLayout>
      <div className="flex justify-center px-2">
        <div className="container max-w-2xl py-8 items-center justify-center">
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-3xl font-bold">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Please provide some additional information to complete your
              profile.
            </p>
          </div>
          <ProfileForm />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
