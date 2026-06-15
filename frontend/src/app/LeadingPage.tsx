"use client";
import React, { FC } from "react";
import { Hero } from "@/components/leading/Hero";
import { useAuthStore } from "@/store/auth";
import { AuthenticatedHome } from "@/components/home/AuthenticatedHome";

const LeadingPage: FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="m-auto h-full max-w-[1550px]">
      {!isAuthenticated ? <Hero /> : <AuthenticatedHome />}
    </div>
  );
};

export default LeadingPage;
