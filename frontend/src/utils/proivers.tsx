"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { ChatSocketProvider } from "@/contexts/ChatSocketContext";
import { GlobalNotificationNotifier } from "@/components/common/GlobalNotificationNotifier";
import { AppShell } from "@/components/common/AppShell";

function AuthProvider({ children }: { children: ReactNode }) {
  useAuthCheck();
  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <AuthModalProvider>
            <ChatSocketProvider>
              <GlobalNotificationNotifier />
              <AppShell>{children}</AppShell>
            </ChatSocketProvider>
          </AuthModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
