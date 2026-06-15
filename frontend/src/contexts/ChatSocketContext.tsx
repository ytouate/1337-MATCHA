"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import type { ChatMessageResponse, NotificationResponse } from "@/api/model";

type WsEvent =
  | { event: "chat.history"; data: { username: string; messages: ChatMessageResponse[] } }
  | { event: "chat.message"; data: { username: string; message: ChatMessageResponse } }
  | { event: "notification.new"; data: { notification: NotificationResponse } }
  | { event: "error"; data: { detail: string } };

interface ChatSocketContextValue {
  isConnected: boolean;
  sendMessage: (username: string, body: string) => Promise<void>;
  loadHistory: (username: string) => Promise<ChatMessageResponse[]>;
  subscribe: (
    username: string,
    handlers: {
      onMessage?: (message: ChatMessageResponse) => void;
      onError?: (detail: string) => void;
    }
  ) => () => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function getWsUrl() {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/ws`;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7001";
  return apiUrl.replace(/^http/, "ws") + "/api/ws";
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef<
    Map<
      string,
      Set<{
        onMessage?: (message: ChatMessageResponse) => void;
        onError?: (detail: string) => void;
      }>
    >
  >(new Map());
  const pendingHistoryRef = useRef<
    Map<
      string,
      {
        resolve: (messages: ChatMessageResponse[]) => void;
        reject: (error: Error) => void;
      }
    >
  >(new Map());
  const pendingSendRef = useRef<
    Map<string, { resolve: () => void; reject: (error: Error) => void }>
  >(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectRef = useRef<() => void>(() => {});

  isAuthenticatedRef.current = isAuthenticated;

  const notifyThread = useCallback(
    (
      username: string,
      fn: (handlers: {
        onMessage?: (message: ChatMessageResponse) => void;
        onError?: (detail: string) => void;
      }) => void
    ) => {
      const set = subscribersRef.current.get(username);
      if (!set) return;
      set.forEach((handlers) => fn(handlers));
    },
    []
  );

  const handleEvent = useCallback(
    (payload: WsEvent) => {
      if (payload.event === "chat.history") {
        const { username, messages } = payload.data;
        const pending = pendingHistoryRef.current.get(username);
        if (pending) {
          pendingHistoryRef.current.delete(username);
          pending.resolve(messages);
        }
        return;
      }

      if (payload.event === "chat.message") {
        const { username, message } = payload.data;
        notifyThread(username, (handlers) => handlers.onMessage?.(message));

        const pendingSend = pendingSendRef.current.get(username);
        if (pendingSend && message.is_mine) {
          pendingSendRef.current.delete(username);
          pendingSend.resolve();
        }
        return;
      }

      if (payload.event === "notification.new") {
        const { notification } = payload.data;

        queryClient.setQueryData<NotificationResponse[]>(
          ["notifications"],
          (current) => {
            const withoutDuplicate = (current ?? []).filter(
              (item) => item.id !== notification.id
            );
            return [notification, ...withoutDuplicate];
          }
        );

        if (!notification.read_at) {
          queryClient.setQueryData<{ count: number }>(
            ["notifications", "unread-count"],
            (current) => ({ count: (current?.count ?? 0) + 1 })
          );
        }
        return;
      }

      if (payload.event === "error") {
        const detail = payload.data.detail;
        for (const [, pending] of pendingHistoryRef.current.entries()) {
          pending.reject(new Error(detail));
        }
        pendingHistoryRef.current.clear();

        for (const [, pending] of pendingSendRef.current.entries()) {
          pending.reject(new Error(detail));
        }
        pendingSendRef.current.clear();

        subscribersRef.current.forEach((set) => {
          set.forEach((handlers) => handlers.onError?.(detail));
        });
      }
    },
    [notifyThread, queryClient]
  );

  const handleEventRef = useRef(handleEvent);
  handleEventRef.current = handleEvent;

  const scheduleReconnect = useCallback(() => {
    if (!isAuthenticatedRef.current || reconnectTimerRef.current) {
      return;
    }

    const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10000);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectAttemptRef.current += 1;
      connectRef.current();
    }, delay);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;
    setIsConnected(false);

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticatedRef.current) {
      return;
    }

    const existing = socketRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (existing) {
      existing.close();
    }

    const socket = new WebSocket(getWsUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        handleEventRef.current(JSON.parse(event.data) as WsEvent);
      } catch {
        // ignore malformed payloads
      }
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        setIsConnected(false);
      }
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [scheduleReconnect]);

  connectRef.current = connect;

  useEffect(() => {
    if (!isAuthenticated) {
      disconnect();
      reconnectAttemptRef.current = 0;
      return;
    }

    connect();

    return () => {
      disconnect();
      reconnectAttemptRef.current = 0;
    };
  }, [connect, disconnect, isAuthenticated]);

  const waitForSocket = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (
      !socketRef.current ||
      socketRef.current.readyState === WebSocket.CLOSED ||
      socketRef.current.readyState === WebSocket.CLOSING
    ) {
      connectRef.current();
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("WebSocket connection timeout")),
        10000
      );

      const tryResolve = () => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
          return true;
        }
        return false;
      };

      if (tryResolve()) {
        return;
      }

      const socket = socketRef.current;
      if (!socket) {
        clearTimeout(timeout);
        reject(new Error("WebSocket is not connected"));
        return;
      }

      const onOpen = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onClose = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket is not connected"));
      };

      socket.addEventListener("open", onOpen, { once: true });
      socket.addEventListener("close", onClose, { once: true });
    });
  }, []);

  const loadHistory = useCallback(
    async (username: string) => {
      await waitForSocket();

      return new Promise<ChatMessageResponse[]>((resolve, reject) => {
        pendingHistoryRef.current.set(username, { resolve, reject });
        socketRef.current?.send(
          JSON.stringify({ event: "chat.history", data: { username } })
        );

        setTimeout(() => {
          if (pendingHistoryRef.current.has(username)) {
            pendingHistoryRef.current.delete(username);
            reject(new Error("Timed out loading chat history"));
          }
        }, 10000);
      });
    },
    [waitForSocket]
  );

  const sendMessage = useCallback(
    async (username: string, body: string) => {
      await waitForSocket();

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      return new Promise<void>((resolve, reject) => {
        pendingSendRef.current.set(username, { resolve, reject });
        socket.send(
          JSON.stringify({
            event: "chat.send",
            data: { username, body },
          })
        );

        setTimeout(() => {
          if (pendingSendRef.current.has(username)) {
            pendingSendRef.current.delete(username);
            reject(new Error("Timed out sending message"));
          }
        }, 10000);
      });
    },
    [waitForSocket]
  );

  const subscribe = useCallback(
    (
      username: string,
      handlers: {
        onMessage?: (message: ChatMessageResponse) => void;
        onError?: (detail: string) => void;
      }
    ) => {
      const current = subscribersRef.current.get(username) ?? new Set();
      current.add(handlers);
      subscribersRef.current.set(username, current);

      return () => {
        const set = subscribersRef.current.get(username);
        if (!set) return;
        set.delete(handlers);
        if (set.size === 0) {
          subscribersRef.current.delete(username);
        }
      };
    },
    []
  );

  return (
    <ChatSocketContext.Provider
      value={{ isConnected, sendMessage, loadHistory, subscribe }}
    >
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return context;
}
