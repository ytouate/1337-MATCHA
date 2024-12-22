"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";

interface Props {
  setSigninModalOpen: (value: boolean) => void;
}

export const Navbar = ({ setSigninModalOpen }: Props) => {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  return (
    <div className="fixed left-0 right-0 p-4">
      <div className="max-w-[1550px] m-auto flex w-full justify-between">
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
            <Button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="rounded-full"
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
