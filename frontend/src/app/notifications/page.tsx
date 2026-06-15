"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { notificationsApi } from "@/api/client";
import type { NotificationResponse } from "@/api/model";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await notificationsApi.listNotificationsApiNotificationsGet()) as NotificationResponse[],
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      notificationsApi.markAllNotificationsReadApiNotificationsReadAllPost(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}

          {!isLoading && notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          )}

          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 ${
                notification.read_at ? "border-border/40" : "border-primary/40"
              }`}
            >
              <p className="text-sm">
                <Link
                  href={`/profile/${notification.actor.username}`}
                  className="font-medium hover:underline"
                >
                  {notification.actor.first_name} {notification.actor.last_name}
                </Link>{" "}
                {notification.type === "like" && "liked your profile"}
                {notification.type === "connection" && "is now connected with you"}
                {notification.type === "message" && "sent you a message"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
