"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { socialApi } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function BlockedUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: () => socialApi.getMyBlockedUsersApiUsersMeBlockedGet(),
  });

  const unblockMutation = useMutation({
    mutationFn: (username: string) =>
      socialApi.unblockUserApiUsersUsernameBlockDelete(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast({
        title: "User unblocked",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Could not unblock user",
        variant: "error",
      });
    },
  });

  const blocked = data?.blocked ?? [];

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <PageHeader
          eyebrow="Account"
          title="Blocked users"
          description="People you blocked will not appear in search or be able to contact you."
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have not blocked anyone.
          </p>
        ) : (
          <div className="space-y-3">
            {blocked.map((user) => (
              <Card
                key={user.username}
                className="border-border/60 shadow-none"
              >
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                      {user.profile_picture ? (
                        <ProfileImage
                          src={user.profile_picture}
                          alt={user.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-medium">
                          {user.first_name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/profile/${user.username}`}
                        className="font-medium hover:underline"
                      >
                        {user.first_name} {user.last_name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                      {user.blocked_at && (
                        <p className="text-xs text-muted-foreground">
                          Blocked {new Date(user.blocked_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unblockMutation.mutate(user.username)}
                    disabled={unblockMutation.isPending}
                  >
                    Unblock
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
