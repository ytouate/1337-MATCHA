"use client";

import type { ChatMessageResponse, NotificationResponse } from "@/api/model";
import { getActiveChatUsername } from "@/lib/messageNotifications";
import {
  REALTIME_HEARTBEAT_INTERVAL_MS,
  REALTIME_HEARTBEAT_TIMEOUT_MS,
  REALTIME_MAX_DELAY_MS,
  getReconnectDelayMs,
} from "@/lib/realtimeConfig";
import { getWsApiUrl } from "@/lib/wsConfig";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CallSignalData = Record<string, unknown>;

type WsEvent =
  | {
      event: "chat.history";
      data: { username: string; messages: ChatMessageResponse[] };
    }
  | {
      event: "chat.message";
      data: { username: string; message: ChatMessageResponse };
    }
  | { event: "notification.new"; data: { notification: NotificationResponse } }
  | { event: "pong"; data: Record<string, never> }
  | { event: "error"; data: { detail: string } }
  | { event: `call.${string}`; data: CallSignalData };

interface ChatSocketContextValue {
  isConnected: boolean;
  sendMessage: (username: string, body: string) => Promise<void>;
  loadHistory: (username: string) => Promise<ChatMessageResponse[]>;
  sendCallSignal: (event: string, data: CallSignalData) => Promise<void>;
  subscribe: (
    username: string,
    handlers: {
      onMessage?: (message: ChatMessageResponse) => void;
      onError?: (detail: string) => void;
    },
  ) => () => void;
  subscribeNotifications: (
    handler: (notification: NotificationResponse) => void,
  ) => () => void;
  subscribeCall: (
    handler: (event: string, data: CallSignalData) => void,
  ) => () => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function waitForAuth(): Promise<void> {
  if (useAuthStore.getState().isAuthenticated) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error("Authentication timeout"));
    }, REALTIME_MAX_DELAY_MS);

    const unsub = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated) {
        clearTimeout(timeout);
        unsub();
        resolve();
      }
    });
  });
}

function getWsUrl() {
  return getWsApiUrl();
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const socketRef = useRef<WebSocket | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const activeChatUsernameRef = useRef<string | null>(null);
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
  const notificationSubscribersRef = useRef<
    Set<(notification: NotificationResponse) => void>
  >(new Set());
  const callSubscribersRef = useRef<
    Set<(event: string, data: CallSignalData) => void>
  >(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectRef = useRef<() => void>(() => {});
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const awaitingPongRef = useRef(false);

  isAuthenticatedRef.current = isAuthenticated;
  activeChatUsernameRef.current = getActiveChatUsername(pathname);

  const notifyThread = useCallback(
    (
      username: string,
      fn: (handlers: {
        onMessage?: (message: ChatMessageResponse) => void;
        onError?: (detail: string) => void;
      }) => void,
    ) => {
      const set = subscribersRef.current.get(username);
      if (!set) return;
      set.forEach((handlers) => fn(handlers));
    },
    [],
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

      if (payload.event === "pong") {
        awaitingPongRef.current = false;
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }
        return;
      }

      if (payload.event === "notification.new") {
        const { notification } = payload.data;
        const isViewingMessageThread =
          notification.type === "message" &&
          activeChatUsernameRef.current === notification.actor.username;

        queryClient.setQueryData<NotificationResponse[]>(
          ["notifications"],
          (current) => {
            const withoutDuplicate = (current ?? []).filter(
              (item) => item.id !== notification.id,
            );
            return [notification, ...withoutDuplicate];
          },
        );

        if (!notification.read_at && !isViewingMessageThread) {
          queryClient.setQueryData<{ count: number }>(
            ["notifications", "unread-count"],
            (current) => ({ count: (current?.count ?? 0) + 1 }),
          );
        }

        notificationSubscribersRef.current.forEach((handler) => {
          handler(notification);
        });
        return;
      }

      if (payload.event.startsWith("call.")) {
        callSubscribersRef.current.forEach((handler) => {
          handler(payload.event, payload.data);
        });
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
    [notifyThread, queryClient],
  );

  const handleEventRef = useRef(handleEvent);
  handleEventRef.current = handleEvent;

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    awaitingPongRef.current = false;
  }, []);

  const startHeartbeat = useCallback(
    (socket: WebSocket) => {
      stopHeartbeat();
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }

        awaitingPongRef.current = true;
        socket.send(JSON.stringify({ event: "ping", data: {} }));

        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }

        heartbeatTimeoutRef.current = setTimeout(() => {
          if (awaitingPongRef.current) {
            socket.close();
          }
        }, REALTIME_HEARTBEAT_TIMEOUT_MS);
      }, REALTIME_HEARTBEAT_INTERVAL_MS);
    },
    [stopHeartbeat],
  );

  const syncNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  }, [queryClient]);

  const scheduleReconnect = useCallback(() => {
    if (!isAuthenticatedRef.current || reconnectTimerRef.current) {
      return;
    }

    const delay = getReconnectDelayMs(reconnectAttemptRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectAttemptRef.current += 1;
      connectRef.current();
    }, delay);
  }, []);

  const disconnect = useCallback(() => {
    stopHeartbeat();

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
  }, [stopHeartbeat]);

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
      startHeartbeat(socket);
      syncNotifications();
    };

    socket.onmessage = (event) => {
      try {
        handleEventRef.current(JSON.parse(event.data) as WsEvent);
      } catch {
        // ignore malformed payloads
      }
    };

    socket.onclose = () => {
      stopHeartbeat();
      if (socketRef.current === socket) {
        socketRef.current = null;
        setIsConnected(false);
      }
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [scheduleReconnect, startHeartbeat, stopHeartbeat, syncNotifications]);

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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, syncNotifications]);

  const waitForSocket = useCallback(async () => {
    await waitForAuth();
    isAuthenticatedRef.current = useAuthStore.getState().isAuthenticated;

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
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("WebSocket connection timeout"));
      }, REALTIME_MAX_DELAY_MS);

      let socketListener: WebSocket | null = null;

      const cleanup = () => {
        clearTimeout(timeout);
        unsubAuth();
        if (socketListener) {
          socketListener.removeEventListener("open", onOpen);
          socketListener.removeEventListener("close", onClose);
        }
      };

      const onOpen = () => {
        cleanup();
        resolve();
      };

      const onClose = () => {
        cleanup();
        reject(new Error("WebSocket is not connected"));
      };

      const attachToSocket = (socket: WebSocket) => {
        if (socketListener === socket) return;
        if (socketListener) {
          socketListener.removeEventListener("open", onOpen);
          socketListener.removeEventListener("close", onClose);
        }
        socketListener = socket;
        socket.addEventListener("open", onOpen, { once: true });
        socket.addEventListener("close", onClose, { once: true });
      };

      const tryResolve = () => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          cleanup();
          resolve();
          return true;
        }
        if (socket) {
          attachToSocket(socket);
        }
        return false;
      };

      const unsubAuth = useAuthStore.subscribe((state) => {
        if (!state.isAuthenticated) return;
        isAuthenticatedRef.current = true;
        connectRef.current();
        tryResolve();
      });

      if (tryResolve()) {
        return;
      }

      if (!socketRef.current) {
        connectRef.current();
        tryResolve();
      }
    });
  }, []);

  const loadHistory = useCallback(
    async (username: string) => {
      await waitForSocket();

      return new Promise<ChatMessageResponse[]>((resolve, reject) => {
        pendingHistoryRef.current.set(username, { resolve, reject });
        socketRef.current?.send(
          JSON.stringify({ event: "chat.history", data: { username } }),
        );

        setTimeout(() => {
          if (pendingHistoryRef.current.has(username)) {
            pendingHistoryRef.current.delete(username);
            reject(new Error("Timed out loading chat history"));
          }
        }, REALTIME_MAX_DELAY_MS);
      });
    },
    [waitForSocket],
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
          }),
        );

        setTimeout(() => {
          if (pendingSendRef.current.has(username)) {
            pendingSendRef.current.delete(username);
            reject(new Error("Timed out sending message"));
          }
        }, REALTIME_MAX_DELAY_MS);
      });
    },
    [waitForSocket],
  );

  const subscribe = useCallback(
    (
      username: string,
      handlers: {
        onMessage?: (message: ChatMessageResponse) => void;
        onError?: (detail: string) => void;
      },
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
    [],
  );

  const sendCallSignal = useCallback(
    async (event: string, data: CallSignalData) => {
      await waitForSocket();
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      socket.send(JSON.stringify({ event, data }));
    },
    [waitForSocket],
  );

  const subscribeCall = useCallback(
    (handler: (event: string, data: CallSignalData) => void) => {
      callSubscribersRef.current.add(handler);
      return () => {
        callSubscribersRef.current.delete(handler);
      };
    },
    [],
  );

  const subscribeNotifications = useCallback(
    (handler: (notification: NotificationResponse) => void) => {
      notificationSubscribersRef.current.add(handler);
      return () => {
        notificationSubscribersRef.current.delete(handler);
      };
    },
    [],
  );

  return (
    <ChatSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        loadHistory,
        sendCallSignal,
        subscribe,
        subscribeNotifications,
        subscribeCall,
      }}
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
