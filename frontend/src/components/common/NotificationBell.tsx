"use client";

import { notificationsApi } from "@/api/client";
import type { NotificationResponse } from "@/api/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getActorName,
  getNotificationHref,
  getNotificationListLabel,
} from "@/lib/notificationPresentation";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/realtimeConfig";
import { useAuthStore } from "@/store/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data: unreadCountData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () =>
      (await notificationsApi.getUnreadCountApiNotificationsUnreadCountGet()) as {
        count: number;
      },
    refetchInterval: isAuthenticated ? REALTIME_POLL_INTERVAL_MS : false,
  });

  const cachedNotifications =
    queryClient.getQueryData<NotificationResponse[]>(["notifications"]) ?? [];

  const { data: fetchedNotifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await notificationsApi.listNotificationsApiNotificationsGet()) as NotificationResponse[],
    enabled: cachedNotifications.length === 0,
  });

  const notifications =
    cachedNotifications.length > 0 ? cachedNotifications : fetchedNotifications;

  const unreadNotifications = notifications
    .filter((notification) => !notification.read_at)
    .slice(0, 5);

  const count = unreadCountData?.count ?? 0;

  const markRead = async (notificationId: number) => {
    await notificationsApi.markNotificationReadApiNotificationsNotificationIdReadPatch(
      notificationId,
    );

    const readAt = new Date().toISOString();
    queryClient.setQueryData<NotificationResponse[]>(
      ["notifications"],
      (current) =>
        (current ?? []).map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: readAt }
            : notification,
        ),
    );
    queryClient.setQueryData<{ count: number }>(
      ["notifications", "unread-count"],
      (current) => ({ count: Math.max(0, (current?.count ?? 0) - 1) }),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="touch" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {unreadNotifications.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No unread notifications
            </p>
          )}
          {unreadNotifications.map((notification) => (
            <Link
              key={notification.id}
              href={getNotificationHref(notification)}
              onClick={() => {
                void markRead(notification.id);
              }}
              className="block border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <p className="text-sm font-medium">
                {getActorName(notification)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getNotificationListLabel(notification)}
              </p>
            </Link>
          ))}
        </div>
        <div className="border-t px-4 py-3">
          <Link
            href="/notifications"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
