export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7001").replace(
    /\/$/,
    "",
  );
}

export function getWsApiUrl(): string {
  return `${getApiBaseUrl().replace(/^http/, "ws")}/api/ws`;
}
