export function getActiveChatUsername(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/chat\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function shouldNotifyMessage(
  pathname: string | null,
  senderUsername: string
): boolean {
  const activeThread = getActiveChatUsername(pathname);
  return activeThread !== senderUsername;
}
