"use client";

import { Button } from "../ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";

export const Hero = () => {
  const { openSignup } = useAuthModal();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 p-8 text-center">
      <h1 className="text-bold text-3xl font-bold sm:text-xl md:text-5xl">
        Find your perfect match from anywhere.
      </h1>
      <p className="max-w-[800px] text-sm md:text-xl">
        Discover meaningful connections from anywhere in the world. Join a
        community where genuine relationships are built, one match at a time.
      </p>
      <Button onClick={openSignup}>Get Started</Button>
    </div>
  );
};
