"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

function ThemeIcon({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Sun className={className} aria-hidden="true" />;
  }

  return resolvedTheme === "dark" ? (
    <Sun className={className} aria-hidden="true" />
  ) : (
    <Moon className={className} aria-hidden="true" />
  );
}

export function ThemeToggleButton({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle theme"
    >
      <ThemeIcon />
    </Button>
  );
}

export function ThemeToggleMenuItem() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenuItem
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <ThemeIcon className="mr-2 h-4 w-4" />
      Toggle theme
    </DropdownMenuItem>
  );
}
