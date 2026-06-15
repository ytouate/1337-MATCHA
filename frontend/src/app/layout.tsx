import { Fira_Code, Outfit } from "next/font/google";
import Providers from "@/utils/proivers";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${firaCode.variable} min-h-screen bg-background font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
