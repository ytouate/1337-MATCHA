"use client";

import { NotificationBell } from "@/components/common/NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useSignout } from "@/hooks/auth/useSignout";
import { useAuthStore } from "@/store/auth";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

export const Navbar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { mutate: signout } = useSignout();
  const { setTheme, theme } = useTheme();
  const { openSignin } = useAuthModal();

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-background">
      <div className="m-auto flex w-full max-w-[1550px] justify-between p-4">
        <Button className="font-bold" variant="link" asChild>
          <Link href="/">MATCHA</Link>
        </Button>
        <div className="flex items-center space-x-4 sm:space-x-6">
          {isAuthenticated && user && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">Search</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/chat">Chat</Link>
              </Button>
              <NotificationBell />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile/edit">Edit profile</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/profile/${user.username}`}>My profile</Link>
              </Button>
            </>
          )}
          <Button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            variant="ghost"
            className="cursor-pointer rounded-lg focus:bg-primary focus:text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          {isAuthenticated ? (
            <Button onClick={() => signout()} className="rounded-full">
              Logout
            </Button>
          ) : (
            <Button onClick={openSignin} className="rounded-full">
              Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
