"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSignout } from "@/hooks/auth/useSignout";

interface Props {
  setSigninModalOpen: (value: boolean) => void;
}

export const Navbar = ({ setSigninModalOpen }: Props) => {
  const { isAuthenticated } = useAuthStore();
  const { mutate: signout } = useSignout();
  const { setTheme, theme } = useTheme();

  return (
    <div className="fixed left-0 right-0 top-0 bg-background z-50">
      <div className="max-w-[1550px] m-auto flex w-full justify-between p-4">
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
            <Button
              onClick={() => setSigninModalOpen(true)}
              className="rounded-full"
            >
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
