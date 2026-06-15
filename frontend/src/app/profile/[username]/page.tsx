"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Heart, MessageCircle, ShieldBan, Flag } from "lucide-react";
import { useParams } from "next/navigation";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { socialApi, usersApi } from "@/api/client";
import type { UserProfileResponse } from "@/api/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";

function formatLastSeen(lastSeenAt?: string | null) {
  if (!lastSeenAt) return "Last seen unknown";
  return `Last seen ${new Date(lastSeenAt).toLocaleString()}`;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () =>
      (await usersApi.getUserApiUsersUsernameGet(
        username
      )) as UserProfileResponse,
    enabled: !!username,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["profile", username] });
    queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    queryClient.invalidateQueries({ queryKey: ["connections"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const likeMutation = useMutation({
    mutationFn: () => usersApi.likeUserApiUsersUsernameLikePost(username),
    onSuccess: invalidate,
  });

  const unlikeMutation = useMutation({
    mutationFn: () => usersApi.unlikeUserApiUsersUsernameLikeDelete(username),
    onSuccess: invalidate,
  });

  const blockMutation = useMutation({
    mutationFn: () => socialApi.blockUserApiUsersUsernameBlockPost(username),
    onSuccess: invalidate,
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      socialApi.reportUserApiUsersUsernameReportPost(username, {
        reason: "Suspected fake account",
      }),
  });

  const isOwnProfile = currentUser?.username === username;
  const isLiked = profile?.is_liked_by_viewer ?? false;

  const content = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }

    if (isError || !profile) {
      return <p className="text-muted-foreground">Profile not found.</p>;
    }

    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <div className="relative h-32 w-32 overflow-hidden rounded-full bg-muted">
              {profile.profile_picture ? (
                <ProfileImage
                  src={profile.profile_picture}
                  alt={profile.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted-foreground">
                  {profile.first_name?.[0]}
                </div>
              )}
            </div>
            {!isOwnProfile && currentUser && !isLiked && (
              <Button
                size="icon"
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full"
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending}
                aria-label="Like profile"
              >
                <Heart className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold">
                {profile.first_name} {profile.last_name}
                {profile.age != null ? `, ${profile.age}` : ""}
              </h1>
              {profile.is_online ? (
                <Badge className="bg-green-600 hover:bg-green-600">Online</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {formatLastSeen(profile.last_seen_at)}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary">
                Fame: {profile.fame_rating ?? 0}
              </Badge>
              {profile.has_liked_viewer && (
                <Badge variant="outline">Liked you</Badge>
              )}
              {profile.is_connected && (
                <Badge variant="default">Connected</Badge>
              )}
            </div>

            {!isOwnProfile && currentUser && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {isLiked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unlikeMutation.mutate()}
                    disabled={unlikeMutation.isPending}
                  >
                    <Heart className="mr-1.5 h-4 w-4 fill-current" />
                    Unlike
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                  >
                    <Heart className="mr-1.5 h-4 w-4" />
                    Like
                  </Button>
                )}

                {profile.is_connected && (
                  <Button size="sm" asChild>
                    <Link href={`/chat/${profile.username}`}>
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      Message
                    </Link>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => blockMutation.mutate()}
                  disabled={blockMutation.isPending}
                >
                  <ShieldBan className="mr-1.5 h-4 w-4" />
                  Block
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => reportMutation.mutate()}
                  disabled={reportMutation.isPending}
                >
                  <Flag className="mr-1.5 h-4 w-4" />
                  Report
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {profile.gender && (
            <p>
              <span className="text-muted-foreground">Gender: </span>
              {profile.gender}
            </p>
          )}
          {profile.sexual_preference && (
            <p>
              <span className="text-muted-foreground">Looking for: </span>
              {profile.sexual_preference}
            </p>
          )}
        </div>

        {profile.bio && (
          <Card className="border-border/60 shadow-none">
            <CardContent className="pt-6">
              <p className="leading-relaxed text-foreground">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Interests
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Badge key={interest} variant="outline">
                  #{interest.toLowerCase().replace(/\s+/g, "")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {profile.images && profile.images.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Photos
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.images.map((img) => (
                <div
                  key={img.url}
                  className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
                >
                  <ProfileImage
                    src={img.url}
                    alt="Profile photo"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.location_label && (
          <p className="text-sm text-muted-foreground">
            Near {profile.location_label}
          </p>
        )}
      </div>
    );
  };

  if (!currentUser) {
    return <div className="mx-auto max-w-2xl px-4 py-12">{content()}</div>;
  }

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {isOwnProfile && (
          <div className="mb-6">
            <Link
              href="/profile/edit"
              className="text-sm text-primary hover:underline"
            >
              Edit your profile
            </Link>
          </div>
        )}
        {content()}
      </div>
    </AuthenticatedLayout>
  );
}
