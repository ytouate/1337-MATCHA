"use client";

import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioCall } from "@/hooks/chat/useAudioCall";
import type { AudioCallStatus } from "@/lib/audioCall";

function statusLabel(status: AudioCallStatus): string {
  switch (status) {
    case "outgoing":
      return "Calling...";
    case "incoming":
      return "Incoming call";
    case "connecting":
      return "Connecting...";
    case "active":
      return "Connected";
    case "error":
      return "Call failed";
    case "ended":
      return "Call ended";
    default:
      return "";
  }
}

export function AudioCallOverlay() {
  const {
    status,
    peerUsername,
    isMuted,
    error,
    remoteAudioRef,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
  } = useAudioCall();

  if (
    status === "idle" ||
    status === "ended" ||
    status === "error"
  ) {
    return <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />;
  }

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {peerUsername ? `@${peerUsername}` : "Audio call"}
            </p>
            <p className="text-sm text-muted-foreground">{statusLabel(status)}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {status === "incoming" && (
              <>
                <Button type="button" onClick={() => acceptCall()}>
                  <Phone className="mr-2 h-4 w-4" />
                  Accept
                </Button>
                <Button type="button" variant="outline" onClick={() => rejectCall()}>
                  Decline
                </Button>
              </>
            )}

            {(status === "outgoing" ||
              status === "connecting" ||
              status === "active") && (
              <>
                {(status === "connecting" || status === "active") && (
                  <Button type="button" variant="outline" onClick={toggleMute}>
                    {isMuted ? (
                      <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
                        Mute
                      </>
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => hangUp()}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Hang up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
