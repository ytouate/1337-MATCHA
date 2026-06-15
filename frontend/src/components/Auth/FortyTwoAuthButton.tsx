"use client";

import { Button } from "@/components/ui/button";
import { getFortyTwoLoginUrl } from "@/lib/oauth";

export function FortyTwoAuthButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.href = getFortyTwoLoginUrl();
      }}
    >
      Continue with 42
    </Button>
  );
}
