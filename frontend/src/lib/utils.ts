import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:7001"
).replace(/\/$/, "");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function encodeImagePath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getImageUrl(path: string) {
  if (!path) return "";

  let absolute: string;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    absolute = path;
  } else {
    const normalized = path.startsWith("/api/images/")
      ? path
      : `/api/images/${path.replace(/^\/+/, "")}`;
    absolute = `${API_BASE}${normalized}`;
  }

  try {
    const url = new URL(absolute);
    const prefix = "/api/images/";
    if (!url.pathname.startsWith(prefix)) {
      return absolute;
    }

    const objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
    return `${url.origin}${prefix}${encodeImagePath(objectPath)}`;
  } catch {
    return absolute;
  }
}

export function toStoredImagePath(url: string) {
  if (!url) return "";

  let path = url;

  if (path.startsWith(API_BASE)) {
    path = path.slice(API_BASE.length);
  }

  const apiPrefix = "/api/images/";
  if (path.startsWith(apiPrefix)) {
    return decodeURIComponent(path.slice(apiPrefix.length));
  }

  return decodeURIComponent(path);
}

export function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthdate.getDate())
  ) {
    age--;
  }

  return age;
}
