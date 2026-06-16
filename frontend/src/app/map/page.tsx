"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { ActiveFilterChips } from "@/components/browse/ActiveFilterChips";
import {
  BrowseFilters,
  useBrowseFiltersFromUrl,
} from "@/components/browse/BrowseFilters";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isMissingLocationError,
  MAP_PAGE_SIZE,
  useSuggestions,
} from "@/hooks/browse/useSuggestions";

const UserMap = dynamic(
  () =>
    import("@/components/map/UserMap").then((module) => ({
      default: module.UserMap,
    })),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[min(70vh,720px)] w-full rounded-lg" />
    ),
  },
);

function MapContent() {
  const { filters, setFilters } = useBrowseFiltersFromUrl("/map");
  const mapFilters = { ...filters, limit: MAP_PAGE_SIZE };
  const { data, isLoading, isError, error } = useSuggestions(mapFilters);

  const profiles = data?.pages.flatMap((page) => page.results) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const viewerLatitude = data?.pages[0]?.viewer_latitude;
  const viewerLongitude = data?.pages[0]?.viewer_longitude;
  const missingLocation = isError && isMissingLocationError(error);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm text-muted-foreground">Nearby profiles</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore matching profiles around you. Pins show approximate locations.
        </p>
      </header>

      <BrowseFilters filters={filters} onChange={setFilters} />
      <ActiveFilterChips filters={filters} onChange={setFilters} />
      <UserMap
        profiles={profiles}
        viewerLatitude={viewerLatitude}
        viewerLongitude={viewerLongitude}
        isLoading={isLoading}
        isMissingLocation={missingLocation}
        isError={isError && !missingLocation}
        total={total}
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <AuthenticatedLayout>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <Skeleton className="mb-6 h-10 w-48" />
            <Skeleton className="h-[min(70vh,720px)] w-full rounded-lg" />
          </div>
        }
      >
        <MapContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
