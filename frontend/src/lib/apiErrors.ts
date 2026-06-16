import { isAxiosError } from "axios";

type ValidationErrorItem = {
  msg?: string;
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function sanitizeDisplayMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return GENERIC_MESSAGE;
  if (/traceback|exception|error:/i.test(trimmed)) {
    return GENERIC_MESSAGE;
  }
  if (trimmed.length > 200) {
    return GENERIC_MESSAGE;
  }
  return trimmed;
}

export function formatApiError(
  error: unknown,
  fallback = GENERIC_MESSAGE,
): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    if (error.code === "ERR_NETWORK") {
      return "Network error. Check your connection and try again.";
    }
    return fallback;
  }

  const data = error.response.data as
    | { detail?: unknown; error?: unknown; message?: unknown }
    | undefined;

  const detail = data?.detail ?? data?.error ?? data?.message;

  if (typeof detail === "string") {
    return sanitizeDisplayMessage(detail);
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return (item as ValidationErrorItem).msg ?? "";
        }
        return "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(". ");
    }
  }

  return fallback;
}

export function formatChatError(message: string | null | undefined): string | null {
  if (!message) return null;
  return sanitizeDisplayMessage(message);
}
