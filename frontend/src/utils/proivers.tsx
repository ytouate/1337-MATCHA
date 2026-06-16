"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { ChatSocketProvider } from "@/contexts/ChatSocketContext";
import { CallManager } from "@/components/chat/CallManager";
import { GlobalNotificationNotifier } from "@/components/common/GlobalNotificationNotifier";
import { AppShell } from "@/components/common/AppShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function AuthProvider({ children }: { children: ReactNode }) {
  useAuthCheck();
  return <>{children}</>;
}

function ClientErrorHandlers() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <ErrorBoundary>
          <ClientErrorHandlers />
          <AuthProvider>
            <AuthModalProvider>
              <ChatSocketProvider>
                <CallManager>
                  <GlobalNotificationNotifier />
                  <AppShell>{children}</AppShell>
                </CallManager>
              </ChatSocketProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
