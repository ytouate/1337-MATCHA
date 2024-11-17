import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const Navbar = ({
  setSigninModalOpen,
}: {
  setSigninModalOpen: (value: boolean) => void;
}) => {
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid rendering during SSR

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
            className="focus:bg-primary hover:bg-primary cursor-pointer rounded-lg  focus:outline-none focus:ring-4 focus:ring-white focus:text-white"
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          <Button
            onClick={() => setSigninModalOpen(true)}
            className="rounded-full"
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
};
