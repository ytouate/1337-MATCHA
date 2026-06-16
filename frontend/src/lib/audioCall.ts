export type AudioCallStatus =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connecting"
  | "active"
  | "ended"
  | "error";

export interface CallSignalPayload {
  call_id: string;
  from_username: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit | null;
}

export const CALL_OUTGOING_TIMEOUT_MS = 30_000;

export function createCallId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `call-${Date.now()}`;
}
