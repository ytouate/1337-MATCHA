"use client";

import type { ReactNode } from "react";
import { AudioCallOverlay } from "@/components/chat/AudioCallOverlay";
import { AudioCallProvider } from "@/hooks/chat/useAudioCall";

export function CallManager({ children }: { children: ReactNode }) {
  return (
    <AudioCallProvider>
      {children}
      <AudioCallOverlay />
    </AudioCallProvider>
  );
}
