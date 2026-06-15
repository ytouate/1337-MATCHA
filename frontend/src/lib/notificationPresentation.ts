import type { NotificationResponse } from "@/api/model";

export function getActorName(notification: NotificationResponse): string {
  return `${notification.actor.first_name} ${notification.actor.last_name}`;
}

export function getNotificationHref(notification: NotificationResponse): string {
  if (notification.type === "message") {
    return `/chat/${notification.actor.username}`;
  }
  return `/profile/${notification.actor.username}`;
}

export function getNotificationDescription(
  notification: NotificationResponse
): string {
  switch (notification.type) {
    case "like":
      return "liked your profile";
    case "view":
      return "viewed your profile";
    case "connection":
      return "is now connected with you";
    case "unlike":
      return "is no longer connected with you";
    case "message":
      return typeof notification.payload?.preview === "string"
        ? notification.payload.preview
        : "sent you a message";
    default:
      return "";
  }
}

export function getNotificationActionLabel(
  notification: NotificationResponse
): string {
  return notification.type === "message" ? "Open chat" : "View profile";
}

export function getNotificationListLabel(
  notification: NotificationResponse
): string {
  switch (notification.type) {
    case "like":
      return "liked your profile";
    case "view":
      return "viewed your profile";
    case "connection":
      return "is now connected with you";
    case "unlike":
      return "is no longer connected with you";
    case "message":
      return "sent you a message";
    default:
      return "";
  }
}
