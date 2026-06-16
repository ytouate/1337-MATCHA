"use client";

import { useChatSocket } from "@/contexts/ChatSocketContext";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/realtimeConfig";
import { useAuthStore } from "@/store/auth";

export function useRealtimePollInterval(): number | false {
  const { isConnected } = useChatSocket();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || isConnected) {
    return false;
  }

  return REALTIME_POLL_INTERVAL_MS;
}
