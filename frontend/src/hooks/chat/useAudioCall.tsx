"use client";

import { useChatSocket } from "@/contexts/ChatSocketContext";
import {
  CALL_OUTGOING_TIMEOUT_MS,
  createCallId,
  type AudioCallStatus,
  type CallSignalPayload,
} from "@/lib/audioCall";
import { RTC_PEER_CONFIG, isWebRtcSupported } from "@/lib/webrtcConfig";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

const WEBRTC_UNSUPPORTED_ERROR =
  "Audio calls are not supported in this browser.";
const MIC_DENIED_ERROR = "Microphone access is required for audio calls.";
const CALL_START_ERROR = "Could not start the audio call. Please try again.";

function playRemoteAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  void audio.play().catch(() => {
    // Firefox may defer playback until after the user gesture window closes.
  });
}

function getCallErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return MIC_DENIED_ERROR;
  }
  return CALL_START_ERROR;
}

interface AudioCallContextValue {
  status: AudioCallStatus;
  peerUsername: string | null;
  callId: string | null;
  isMuted: boolean;
  error: string | null;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  startCall: (username: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
}

const AudioCallContext = createContext<AudioCallContextValue | null>(null);

export function AudioCallProvider({ children }: { children: ReactNode }) {
  const { sendCallSignal, subscribeCall } = useChatSocket();
  const [status, setStatus] = useState<AudioCallStatus>("idle");
  const [peerUsername, setPeerUsername] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const outgoingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef(status);
  const peerRef = useRef(peerUsername);
  const callIdRef = useRef(callId);

  statusRef.current = status;
  peerRef.current = peerUsername;
  callIdRef.current = callId;

  const clearOutgoingTimeout = useCallback(() => {
    if (outgoingTimeoutRef.current) {
      clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingOfferRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setIsMuted(false);
  }, []);

  const resetCall = useCallback(() => {
    clearOutgoingTimeout();
    cleanupMedia();
    setStatus("idle");
    setPeerUsername(null);
    setCallId(null);
    setError(null);
  }, [cleanupMedia, clearOutgoingTimeout]);

  const acquireMicrophone = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const attachLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  const createPeerConnection = useCallback(
    (peer: string, id: string) => {
      const pc = new RTCPeerConnection(RTC_PEER_CONFIG);

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        void sendCallSignal("call.ice", {
          username: peer,
          call_id: id,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          playRemoteAudio(remoteAudioRef.current);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("active");
          clearOutgoingTimeout();
        }
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          cleanupMedia();
          resetCall();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanupMedia, clearOutgoingTimeout, resetCall, sendCallSignal],
  );

  const hangUp = useCallback(async () => {
    const peer = peerRef.current;
    const id = callIdRef.current;
    const currentStatus = statusRef.current;

    clearOutgoingTimeout();

    if (peer && id && currentStatus !== "idle") {
      try {
        await sendCallSignal("call.hangup", {
          username: peer,
          call_id: id,
        });
      } catch {
        // ignore hangup errors during cleanup
      }
    }

    resetCall();
  }, [clearOutgoingTimeout, resetCall, sendCallSignal]);

  const rejectCall = useCallback(async () => {
    const peer = peerRef.current;
    const id = callIdRef.current;
    if (peer && id) {
      await sendCallSignal("call.reject", { username: peer, call_id: id });
    }
    resetCall();
  }, [resetCall, sendCallSignal]);

  const sendOffer = useCallback(
    async (peer: string, id: string) => {
      const pc = createPeerConnection(peer, id);
      attachLocalTracks(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendCallSignal("call.offer", {
        username: peer,
        call_id: id,
        sdp: offer,
      });
      setStatus("connecting");
    },
    [attachLocalTracks, createPeerConnection, sendCallSignal],
  );

  const handleRemoteOffer = useCallback(
    async (peer: string, id: string, sdp: RTCSessionDescriptionInit) => {
      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection(peer, id);
        if (localStreamRef.current) {
          attachLocalTracks(pc);
        }
      }

      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendCallSignal("call.answer", {
        username: peer,
        call_id: id,
        sdp: answer,
      });
      setStatus("connecting");
    },
    [attachLocalTracks, createPeerConnection, sendCallSignal],
  );

  const startCall = useCallback(
    async (username: string) => {
      if (statusRef.current !== "idle") return;

      if (!isWebRtcSupported()) {
        setError(WEBRTC_UNSUPPORTED_ERROR);
        return;
      }

      const id = createCallId();
      setPeerUsername(username);
      setCallId(id);
      setStatus("outgoing");
      setError(null);

      try {
        await acquireMicrophone();
        await sendCallSignal("call.invite", { username, call_id: id });

        outgoingTimeoutRef.current = setTimeout(() => {
          if (statusRef.current === "outgoing") {
            void hangUp();
          }
        }, CALL_OUTGOING_TIMEOUT_MS);
      } catch (error) {
        resetCall();
        setError(getCallErrorMessage(error));
      }
    },
    [acquireMicrophone, hangUp, resetCall, sendCallSignal],
  );

  const acceptCall = useCallback(async () => {
    const peer = peerRef.current;
    const id = callIdRef.current;
    if (!peer || !id || statusRef.current !== "incoming") return;

    if (!isWebRtcSupported()) {
      setError(WEBRTC_UNSUPPORTED_ERROR);
      resetCall();
      return;
    }

    try {
      await acquireMicrophone();
      await sendCallSignal("call.accept", { username: peer, call_id: id });
      setStatus("connecting");

      if (pendingOfferRef.current) {
        const offer = pendingOfferRef.current;
        pendingOfferRef.current = null;
        await handleRemoteOffer(peer, id, offer);
      }
    } catch (error) {
      resetCall();
      setError(getCallErrorMessage(error));
    }
  }, [acquireMicrophone, handleRemoteOffer, resetCall, sendCallSignal]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }, []);

  useEffect(() => {
    return subscribeCall((event, data) => {
      const payload = data as unknown as CallSignalPayload;

      if (event === "call.incoming") {
        if (statusRef.current !== "idle") return;
        setPeerUsername(payload.from_username);
        setCallId(payload.call_id);
        setStatus("incoming");
        return;
      }

      if (!callIdRef.current || payload.call_id !== callIdRef.current) {
        return;
      }

      if (peerRef.current && payload.from_username !== peerRef.current) {
        return;
      }

      if (event === "call.accepted" && statusRef.current === "outgoing") {
        void sendOffer(payload.from_username, payload.call_id);
        return;
      }

      if (event === "call.rejected") {
        resetCall();
        return;
      }

      if (event === "call.offer") {
        if (!payload.sdp) return;
        if (statusRef.current === "incoming") {
          pendingOfferRef.current = payload.sdp;
          return;
        }
        void handleRemoteOffer(
          payload.from_username,
          payload.call_id,
          payload.sdp,
        );
        return;
      }

      if (event === "call.answer" && payload.sdp && pcRef.current) {
        void pcRef.current.setRemoteDescription(payload.sdp).then(() => {
          setStatus("connecting");
        });
        return;
      }

      if (event === "call.ice" && pcRef.current) {
        void pcRef.current
          .addIceCandidate(payload.candidate ?? null)
          .catch(() => {
            // Firefox throws on duplicate or invalid ICE candidates.
          });
        return;
      }

      if (event === "call.ended") {
        resetCall();
      }
    });
  }, [handleRemoteOffer, resetCall, sendOffer, subscribeCall]);

  return (
    <AudioCallContext.Provider
      value={{
        status,
        peerUsername,
        callId,
        isMuted,
        error,
        remoteAudioRef,
        startCall,
        acceptCall,
        rejectCall,
        hangUp,
        toggleMute,
      }}
    >
      {children}
    </AudioCallContext.Provider>
  );
}

export function useAudioCall() {
  const context = useContext(AudioCallContext);
  if (!context) {
    throw new Error("useAudioCall must be used within AudioCallProvider");
  }
  return context;
}
