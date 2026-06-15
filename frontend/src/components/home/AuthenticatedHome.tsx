"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { AuthenticatedLayout } from "../common/AuthenticatedLayout";
import { Button } from "../ui/button";
import { ActiveFilterChips } from "@/components/browse/ActiveFilterChips";
import {
  BrowseFilters,
  useBrowseFiltersFromUrl,
} from "@/components/browse/BrowseFilters";
import { SuggestionGrid } from "@/components/browse/SuggestionGrid";
import {
  isMissingLocationError,
  useSuggestions,
} from "@/hooks/browse/useSuggestions";

function SearchContent() {
  const { user } = useAuthStore();
  const { filters, setFilters } = useBrowseFiltersFromUrl();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuggestions(filters);

  const profiles = data?.pages.flatMap((page) => page.results) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const missingLocation = isError && isMissingLocationError(error);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Advanced Search</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Find profiles, {user?.first_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter and sort matching profiles by age, location, fame rating,
            and shared interests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/edit">Edit profile</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/me/viewers">Viewers</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/me/likes">Likes</Link>
          </Button>
        </div>
      </header>

      <BrowseFilters filters={filters} onChange={setFilters} />
      <ActiveFilterChips filters={filters} onChange={setFilters} />
      <SuggestionGrid
        profiles={profiles}
        isLoading={isLoading}
        isError={isError && !missingLocation}
        isMissingLocation={missingLocation}
        total={total}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  );
}

export const AuthenticatedHome = () => {
  return (
    <AuthenticatedLayout>
      <Suspense
        fallback={
          <div className="p-8 text-sm text-muted-foreground">Loading...</div>
        }
      >
        <SearchContent />
      </Suspense>
    </AuthenticatedLayout>
  );
};
