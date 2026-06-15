"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/client";
import type { ChatMessageResponse, NotificationResponse } from "@/api/model";
import { useChatSocket } from "@/contexts/ChatSocketContext";

export function useChatThread(username: string) {
  const queryClient = useQueryClient();
  const { isConnected, loadHistory, sendMessage, subscribe } = useChatSocket();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const appendMessage = useCallback((message: ChatMessageResponse) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
  }, []);

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
          notification.actor.username === username
      );

      if (unread.length === 0) return;

      await Promise.all(
        unread.map((notification) =>
          notificationsApi.markNotificationReadApiNotificationsNotificationIdReadPatch(
            notification.id
          )
        )
      );

      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationResponse[]>(
        ["notifications"],
        (current) =>
          (current ?? []).map((notification) =>
            unread.some((item) => item.id === notification.id)
              ? { ...notification, read_at: readAt }
              : notification
          )
      );

      queryClient.setQueryData<{ count: number }>(
        ["notifications", "unread-count"],
        (current) => ({
          count: Math.max(0, (current?.count ?? 0) - unread.length),
        })
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
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
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
    if (!username) return;

    return subscribe(username, {
      onMessage: appendMessage,
      onError: (detail) => setError(detail),
    });
  }, [username, subscribe, appendMessage]);

  const send = useCallback(
    async (body: string) => {
      setIsSending(true);
      setError(null);
      try {
        await sendMessage(username, body);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [sendMessage, username]
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
