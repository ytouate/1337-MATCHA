"use client";

import { cn } from "@/lib/utils";

const interests = [
  "Travel",
  "Food",
  "Sports",
  "Music",
  "Art",
  "Reading",
  "Gaming",
  "Fitness",
  "Photography",
  "Movies",
  "Technology",
  "Fashion",
  "Cooking",
  "Yoga",
  "Dancing",
  "Hiking",
  "Pets",
  "Volunteering",
  "Gardening",
  "Writing",
];

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
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter((i) => i !== interest));
    } else if (selectedInterests.length < maxInterests) {
      onInterestsChange([...selectedInterests, interest]);
    }
  };

  const atLimit =
    selectedInterests.length >= maxInterests && selectedInterests.length > 0;

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
              {interest}
            </button>
          );
        })}
      </div>
    </div>
  );
}
