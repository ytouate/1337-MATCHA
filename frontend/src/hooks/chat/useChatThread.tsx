"use client";

import { notificationsApi, socialApi } from "@/api/client";
import type { ChatMessageResponse, NotificationResponse } from "@/api/model";
import { useChatSocket } from "@/contexts/ChatSocketContext";
import { formatChatError } from "@/lib/apiErrors";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/realtimeConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const CHAT_ERROR = "Could not load this conversation. Please try again.";
const SEND_ERROR = "Could not send your message. Please try again.";

function mergeMessages(
  current: ChatMessageResponse[],
  incoming: ChatMessageResponse[],
): ChatMessageResponse[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort(
    (left, right) =>
      new Date(left.created_at).getTime() -
      new Date(right.created_at).getTime(),
  );
}

export function useChatThread(username: string) {
  const queryClient = useQueryClient();
  const { isConnected, loadHistory, sendMessage, subscribe } = useChatSocket();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const appendMessage = useCallback((message: ChatMessageResponse) => {
    setMessages((current) => mergeMessages(current, [message]));
  }, []);

  const pollMessages = useCallback(async () => {
    if (!username) return;

    try {
      const incoming =
        (await socialApi.getChatMessagesApiChatUsernameMessagesGet(
          username,
        )) as ChatMessageResponse[];
      setMessages((current) => mergeMessages(current, incoming));
      setError(null);
      setIsLoading(false);
    } catch {
      // Polling is a best-effort fallback while the socket reconnects.
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;

    const markThreadNotificationsRead = async () => {
      const notifications =
        queryClient.getQueryData<NotificationResponse[]>(["notifications"]) ??
        [];
      const unread = notifications.filter(
        (notification) =>
          notification.type === "message" &&
          !notification.read_at &&
          notification.actor.username === username,
      );

      if (unread.length === 0) return;

      await Promise.all(
        unread.map((notification) =>
          notificationsApi.markNotificationReadApiNotificationsNotificationIdReadPatch(
            notification.id,
          ),
        ),
      );

      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationResponse[]>(
        ["notifications"],
        (current) =>
          (current ?? []).map((notification) =>
            unread.some((item) => item.id === notification.id)
              ? { ...notification, read_at: readAt }
              : notification,
          ),
      );

      queryClient.setQueryData<{ count: number }>(
        ["notifications", "unread-count"],
        (current) => ({
          count: Math.max(0, (current?.count ?? 0) - unread.length),
        }),
      );
    };

    markThreadNotificationsRead().catch(() => {});
  }, [queryClient, username]);

  useEffect(() => {
    if (!username || !isConnected) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    loadHistory(username)
      .then((history) => {
        if (!cancelled) {
          setMessages(history);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(CHAT_ERROR);
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username, loadHistory, isConnected]);

  useEffect(() => {
    if (!username || isConnected) return;

    void pollMessages();
    const interval = setInterval(() => {
      void pollMessages();
    }, REALTIME_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [username, isConnected, pollMessages]);

  useEffect(() => {
    if (!username) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isConnected) {
        void pollMessages();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [username, isConnected, pollMessages]);

  useEffect(() => {
    if (!username) return;

    return subscribe(username, {
      onMessage: appendMessage,
      onError: (detail) => setError(formatChatError(detail) ?? CHAT_ERROR),
    });
  }, [username, subscribe, appendMessage]);

  const send = useCallback(
    async (body: string) => {
      setIsSending(true);
      setError(null);
      try {
        await sendMessage(username, body);
      } catch {
        setError(SEND_ERROR);
        throw new Error(SEND_ERROR);
      } finally {
        setIsSending(false);
      }
    },
    [sendMessage, username],
  );

  return {
    messages,
    isLoading,
    isSending,
    isConnected,
    error,
    send,
  };
}
