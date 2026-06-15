"use client";

import { notificationsApi } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";

export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () =>
      (await notificationsApi.getUnreadCountApiNotificationsUnreadCountGet()) as {
        count: number;
      },
  });

  const count = data?.count ?? 0;

  return (
    <Button variant="ghost" size="sm" className="relative" asChild>
      <Link href="/notifications">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
            {count > 9 ? "9+" : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
