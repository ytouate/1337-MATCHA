import { Api } from "@/models";

export const appAPI = new Api({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
