"use client";

import Link from "next/link";
import { ProfileCard } from "@/components/browse/ProfileCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SuggestedProfile } from "@/api/model";

interface SuggestionGridProps {
  profiles: SuggestedProfile[];
  isLoading: boolean;
  isError?: boolean;
  isMissingLocation?: boolean;
  total?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function SuggestionGrid({
  profiles,
  isLoading,
  isError = false,
  isMissingLocation = false,
  total = 0,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: SuggestionGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/5] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isMissingLocation) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-6 py-16 text-center">
        <p className="text-sm font-medium">Set your location to search profiles</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Advanced search uses your saved location to filter and sort by distance.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/profile/edit">Update location in profile</Link>
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed border-destructive/40 px-6 py-16 text-center">
        <p className="text-sm font-medium">Could not load search results</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your filters and try again.
        </p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-6 py-16 text-center">
        <p className="text-sm font-medium">No profiles match your filters</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try widening your distance or clearing some filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} profile{total === 1 ? "" : "s"} found
        {profiles.length < total
          ? ` · showing ${profiles.length}`
          : ""}
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {profiles.map((profile) => (
          <ProfileCard key={profile.username} profile={profile} />
        ))}
      </div>
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
