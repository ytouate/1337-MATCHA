"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSignout } from "@/hooks/auth/useSignout";
import { useAuthModal } from "@/contexts/AuthModalContext";

export const Navbar = () => {
  const { isAuthenticated } = useAuthStore();
  const { mutate: signout } = useSignout();
  const { setTheme, theme } = useTheme();
  const { openSignin } = useAuthModal();

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-background">
      <div className="m-auto flex w-full max-w-[1550px] justify-between p-4">
        <Button className="font-bold" variant={"link"}>
          MATCHA
        </Button>
        <div className="flex items-center space-x-8">
          <Button
            onClick={() => {
              setTheme(theme == "dark" ? "light" : "dark");
            }}
            variant={"ghost"}
            className={`focus:bg-primary hover:bg-primary cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:text-white`}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          {!isAuthenticated ? (
            <Button onClick={openSignin} className="rounded-full">
              Login
            </Button>
          ) : (
            <Button onClick={() => signout()} className="rounded-full">
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
