"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="space-y-2">
      <Label>Interests (Select up to {maxInterests})</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {interests.map((interest) => (
          <Button
            key={interest}
            variant="outline"
            size="sm"
            className={cn(
              "h-auto py-2 px-4 justify-start",
              selectedInterests.includes(interest) &&
                "bg-primary text-primary-foreground"
            )}
            onClick={() => toggleInterest(interest)}
          >
            {interest}
          </Button>
        ))}
      </div>
    </div>
  );
}
