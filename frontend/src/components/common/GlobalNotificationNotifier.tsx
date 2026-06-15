"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useChatSocket } from "@/contexts/ChatSocketContext";
import { useToast } from "@/hooks/use-toast";
import {
  getActorName,
  getNotificationActionLabel,
  getNotificationDescription,
  getNotificationHref,
} from "@/lib/notificationPresentation";
import { shouldNotifyMessage } from "@/lib/messageNotifications";

export function GlobalNotificationNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { subscribeNotifications } = useChatSocket();

  useEffect(() => {
    return subscribeNotifications((notification) => {
      if (
        notification.type === "message" &&
        !shouldNotifyMessage(pathname, notification.actor.username)
      ) {
        return;
      }

      const href = getNotificationHref(notification);

      toast({
        title: getActorName(notification),
        description: getNotificationDescription(notification),
        action: (
          <ToastAction altText={getNotificationActionLabel(notification)} onClick={() => router.push(href)}>
            {getNotificationActionLabel(notification)}
          </ToastAction>
        ),
      });
    });
  }, [pathname, router, subscribeNotifications, toast]);

  return null;
}
