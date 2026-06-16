"use client";

import { usersApi } from "@/api/client";
import type {
  GetSuggestionsApiUsersSuggestionsGetParams,
  SuggestionListResponse,
} from "@/api/model";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useMemo } from "react";

export const SEARCH_PAGE_SIZE = 20;
export const MAP_PAGE_SIZE = 100;

function getPageSize(filters: BrowseFiltersState): number {
  return filters.limit ?? SEARCH_PAGE_SIZE;
}

export interface BrowseFiltersState {
  sort_by?: GetSuggestionsApiUsersSuggestionsGetParams["sort_by"];
  order?: GetSuggestionsApiUsersSuggestionsGetParams["order"];
  min_age?: number | null;
  max_age?: number | null;
  max_distance_km?: number | null;
  min_fame?: number | null;
  max_fame?: number | null;
  tags?: string[];
  limit?: number;
  offset?: number;
}

function ageOrUndefined(value: number | null | undefined): number | undefined {
  if (value == null || value < 18 || value > 120) return undefined;
  return value;
}

function distanceOrUndefined(
  value: number | null | undefined,
): number | undefined {
  if (value == null || value <= 0) return undefined;
  return value;
}

function fameOrUndefined(value: number | null | undefined): number | undefined {
  if (value == null || value < 0) return undefined;
  return value;
}

export function sanitizeBrowseFilters(
  filters: BrowseFiltersState,
): BrowseFiltersState {
  return {
    ...filters,
    min_age: ageOrUndefined(filters.min_age) ?? null,
    max_age: ageOrUndefined(filters.max_age) ?? null,
    max_distance_km: distanceOrUndefined(filters.max_distance_km) ?? null,
    min_fame: fameOrUndefined(filters.min_fame) ?? null,
    max_fame: fameOrUndefined(filters.max_fame) ?? null,
  };
}

function toApiParams(
  filters: BrowseFiltersState,
  offset: number,
): GetSuggestionsApiUsersSuggestionsGetParams {
  const sanitized = sanitizeBrowseFilters(filters);

  return {
    sort_by: sanitized.sort_by,
    order: sanitized.order,
    min_age: sanitized.min_age ?? undefined,
    max_age: sanitized.max_age ?? undefined,
    max_distance_km: sanitized.max_distance_km ?? undefined,
    min_fame: sanitized.min_fame ?? undefined,
    max_fame: sanitized.max_fame ?? undefined,
    tags: sanitized.tags?.length ? sanitized.tags.join(",") : undefined,
    limit: getPageSize(sanitized),
    offset,
  };
}

function shouldRetrySuggestions(failureCount: number, error: Error) {
  const status = (error as AxiosError)?.response?.status;
  if (status != null && status >= 400 && status < 500) {
    return false;
  }
  return failureCount < 2;
}

export function isMissingLocationError(error: unknown): boolean {
  const axiosError = error as AxiosError<{ detail?: string }>;
  if (axiosError.response?.status !== 403) return false;
  const detail = axiosError.response.data?.detail ?? "";
  return detail.toLowerCase().includes("location");
}

export function useSuggestions(filters: BrowseFiltersState) {
  const queryParams = useMemo(() => toApiParams(filters, 0), [filters]);

  return useInfiniteQuery({
    queryKey: ["suggestions", queryParams],
    queryFn: async ({ pageParam }) =>
      (await usersApi.getSuggestionsApiUsersSuggestionsGet(
        toApiParams(filters, pageParam),
      )) as SuggestionListResponse,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      const pageSize = lastPage.limit ?? getPageSize(filters);
      const nextOffset = lastPageParam + pageSize;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    retry: shouldRetrySuggestions,
  });
}
