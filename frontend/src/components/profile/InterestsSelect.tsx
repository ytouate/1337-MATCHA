"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { uniqueStrings } from "@/lib/uniqueStrings";
import { interestsApi } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";

interface InterestSelectProps {
  selectedInterests: string[];
  onInterestsChange: (value: string[]) => void;
  maxInterests?: number;
}

export function InterestsSelect({
  selectedInterests = [],
  onInterestsChange,
  maxInterests = 5,
}: InterestSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => {
      const response = (await interestsApi.listInterestsApiInterestsGet()) as {
        interests: string[];
      };
      return uniqueStrings(response.interests);
    },
  });

  const interests = data ?? [];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter((i) => i !== interest));
    } else if (selectedInterests.length < maxInterests) {
      onInterestsChange([...selectedInterests, interest]);
    }
  };

  const atLimit =
    selectedInterests.length >= maxInterests && selectedInterests.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {selectedInterests.length} of {maxInterests} selected
      </p>

      <div className="flex flex-wrap gap-2">
        {interests.map((interest) => {
          const selected = selectedInterests.includes(interest);
          const disabled = atLimit && !selected;

          return (
            <button
              key={interest}
              type="button"
              disabled={disabled}
              onClick={() => toggleInterest(interest)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                selected
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                disabled && "cursor-not-allowed opacity-40"
              )}
            >
              #{interest.toLowerCase().replace(/\s+/g, "")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
