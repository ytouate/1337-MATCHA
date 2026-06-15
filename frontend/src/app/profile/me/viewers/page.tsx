"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { usersApi } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SocialUser {
  username: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
  fame_rating?: number;
  viewed_at?: string;
  liked_at?: string;
}

function SocialUserList({
  users,
  timestampKey,
}: {
  users: SocialUser[];
  timestampKey: "viewed_at" | "liked_at";
}) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No one here yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user.username} className="border-border/60 shadow-none">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
              {user.profile_picture ? (
                <ProfileImage
                  src={user.profile_picture}
                  alt={user.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium">
                  {user.first_name[0]}
                </div>
              )}
            </div>
            <div className="flex-1">
              <Link
                href={`/profile/${user.username}`}
                className="font-medium hover:underline"
              >
                {user.first_name} {user.last_name}
              </Link>
              <p className="text-xs text-muted-foreground">
                @{user.username} · Fame {user.fame_rating ?? 0}
              </p>
            </div>
            {user[timestampKey] && (
              <time className="text-xs text-muted-foreground">
                {new Date(user[timestampKey]!).toLocaleDateString()}
              </time>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProfileViewersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["profile", "viewers"],
    queryFn: async () =>
      (await usersApi.getMyViewersApiUsersMeViewersGet()) as SocialUser[],
  });

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">Activity</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Who viewed your profile
          </h1>
        </header>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <SocialUserList users={data ?? []} timestampKey="viewed_at" />
        )}
      </div>
    </AuthenticatedLayout>
  );
}
