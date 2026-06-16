import type { NotificationResponse } from "@/api/model";

export function getActorName(notification: NotificationResponse): string {
  return `${notification.actor.first_name} ${notification.actor.last_name}`;
}

function getDateIdFromPayload(notification: NotificationResponse): number | null {
  const dateId = notification.payload?.date_id;
  return typeof dateId === "number" ? dateId : null;
}

export function getNotificationHref(notification: NotificationResponse): string {
  if (notification.type === "message") {
    return `/chat/${notification.actor.username}`;
  }

  const dateId = getDateIdFromPayload(notification);
  if (dateId && notification.type.startsWith("date_")) {
    return `/dates/${dateId}`;
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
    case "date_proposed":
      return "proposed a date";
    case "date_accepted":
      return "accepted your date";
    case "date_declined":
      return "declined your date";
    case "date_cancelled":
      return "cancelled a date";
    default:
      return "";
  }
}

export function getNotificationActionLabel(
  notification: NotificationResponse
): string {
  if (notification.type === "message") {
    return "Open chat";
  }
  if (notification.type.startsWith("date_")) {
    return "View date";
  }
  return "View profile";
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
    case "date_proposed":
      return "proposed a date";
    case "date_accepted":
      return "accepted your date";
    case "date_declined":
      return "declined your date";
    case "date_cancelled":
      return "cancelled a date";
    default:
      return "";
  }
}
