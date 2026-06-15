"use client";

import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useProfileCompletion } from "@/hooks/profile/useProfileCompletion";

export default function CompleteProfilePage() {
  useProfileCompletion();

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="text-sm text-muted-foreground">Profile setup</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Complete your profile
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            A few details help us suggest better matches nearby. You can change
            these anytime.
          </p>
        </header>

        <ProfileForm />
      </div>
    </AuthenticatedLayout>
  );
}
