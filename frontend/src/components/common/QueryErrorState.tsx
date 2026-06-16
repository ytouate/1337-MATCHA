"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

type QueryErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function QueryErrorState({
  title = "Could not load data",
  description = "Something went wrong. Please try again.",
  onRetry,
  retryLabel = "Try again",
}: QueryErrorStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-destructive/40 px-6 py-10 text-center">
      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive/70" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
