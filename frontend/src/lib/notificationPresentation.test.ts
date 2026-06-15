import { describe, expect, it } from "vitest";
import type { NotificationResponse } from "@/api/model";
import {
  getActorName,
  getNotificationActionLabel,
  getNotificationDescription,
  getNotificationHref,
  getNotificationListLabel,
} from "./notificationPresentation";

const baseNotification: NotificationResponse = {
  id: 1,
  type: "like",
  created_at: "2026-01-01T00:00:00Z",
  actor: {
    username: "alice",
    first_name: "Alice",
    last_name: "Smith",
    profile_picture: null,
  },
};

describe("notificationPresentation", () => {
  it("builds actor name and profile href for social notifications", () => {
    expect(getActorName(baseNotification)).toBe("Alice Smith");
    expect(getNotificationHref(baseNotification)).toBe("/profile/alice");
    expect(getNotificationDescription(baseNotification)).toBe("liked your profile");
    expect(getNotificationActionLabel(baseNotification)).toBe("View profile");
    expect(getNotificationListLabel(baseNotification)).toBe("liked your profile");
  });

  it("builds chat href and preview for messages", () => {
    const message: NotificationResponse = {
      ...baseNotification,
      type: "message",
      payload: { preview: "Hey there" },
    };

    expect(getNotificationHref(message)).toBe("/chat/alice");
    expect(getNotificationDescription(message)).toBe("Hey there");
    expect(getNotificationActionLabel(message)).toBe("Open chat");
    expect(getNotificationListLabel(message)).toBe("sent you a message");
  });

  it("labels view and unlike notifications", () => {
    expect(
      getNotificationListLabel({ ...baseNotification, type: "view" })
    ).toBe("viewed your profile");
    expect(
      getNotificationDescription({ ...baseNotification, type: "unlike" })
    ).toBe("is no longer connected with you");
  });
});
