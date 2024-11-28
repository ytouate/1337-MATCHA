import { Api } from "@/models";

export const appAPI = new Api({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
