"use client";

import Link from "next/link";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { IdentityForm } from "@/components/profile/IdentityForm";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/button";

export default function EditProfilePage() {
  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Settings</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Edit profile
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Update your profile information at any time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/me/viewers">Who viewed me</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/me/likes">Who liked me</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/me/gallery">Manage gallery</Link>
            </Button>
          </div>
        </header>

        <div className="space-y-8">
          <IdentityForm />
          <ProfileForm mode="edit" />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
