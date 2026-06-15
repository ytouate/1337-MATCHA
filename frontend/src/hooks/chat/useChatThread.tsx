"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessageResponse } from "@/api/model";
import { useChatSocket } from "@/contexts/ChatSocketContext";

export function useChatThread(username: string) {
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
  }, [username, loadHistory]);

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
