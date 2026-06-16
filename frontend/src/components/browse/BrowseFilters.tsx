"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { interestsApi } from "@/api/client";
import type { SortBy, SortOrder } from "@/api/model";
import {
  type BrowseFiltersState,
  sanitizeBrowseFilters,
} from "@/hooks/browse/useSuggestions";
import { cn } from "@/lib/utils";

interface BrowseFiltersProps {
  filters: BrowseFiltersState;
  onChange: (filters: BrowseFiltersState) => void;
}

function parseFiltersFromParams(params: URLSearchParams): BrowseFiltersState {
  const tags = params.get("tags");
  return sanitizeBrowseFilters({
    sort_by: (params.get("sort_by") as SortBy) || "distance",
    order: (params.get("order") as SortOrder) || null,
    min_age: params.get("min_age") ? Number(params.get("min_age")) : null,
    max_age: params.get("max_age") ? Number(params.get("max_age")) : null,
    max_distance_km: params.get("max_distance_km")
      ? Number(params.get("max_distance_km"))
      : null,
    min_fame: params.get("min_fame") ? Number(params.get("min_fame")) : null,
    max_fame: params.get("max_fame") ? Number(params.get("max_fame")) : null,
    tags: tags ? tags.split(",").filter(Boolean) : [],
  });
}

function filtersToSearchParams(filters: BrowseFiltersState): string {
  const sanitized = sanitizeBrowseFilters(filters);
  const params = new URLSearchParams();
  if (sanitized.sort_by) params.set("sort_by", sanitized.sort_by);
  if (sanitized.order) params.set("order", sanitized.order);
  if (sanitized.min_age != null) params.set("min_age", String(sanitized.min_age));
  if (sanitized.max_age != null) params.set("max_age", String(sanitized.max_age));
  if (sanitized.max_distance_km != null) {
    params.set("max_distance_km", String(sanitized.max_distance_km));
  }
  if (sanitized.min_fame != null) params.set("min_fame", String(sanitized.min_fame));
  if (sanitized.max_fame != null) params.set("max_fame", String(sanitized.max_fame));
  if (sanitized.tags?.length) params.set("tags", sanitized.tags.join(","));
  return params.toString();
}

export function buildBrowseUrl(
  basePath: "/" | "/map",
  filters: BrowseFiltersState,
): string {
  const query = filtersToSearchParams(filters);
  return query ? `${basePath}?${query}` : basePath;
}

export function useBrowseFiltersFromUrl(basePath: "/" | "/map" = "/") {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams],
  );

  const setFilters = (next: BrowseFiltersState) => {
    const query = filtersToSearchParams(next);
    router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
  };

  return { filters, setFilters };
}

const AUTO_APPLY_DELAY_MS = 300;

export function BrowseFilters({ filters, onChange }: BrowseFiltersProps) {
  const [draft, setDraft] = useState(filters);
  const appliedTagsRef = useRef(filters.tags ?? []);

  useEffect(() => {
    setDraft(filters);
    appliedTagsRef.current = filters.tags ?? [];
  }, [filters]);

  const { data: interests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => {
      const response = (await interestsApi.listInterestsApiInterestsGet()) as {
        interests: string[];
      };
      return response.interests;
    },
  });

  const autoApplySnapshot = useMemo(
    () =>
      JSON.stringify({
        sort_by: draft.sort_by,
        order: draft.order,
        min_age: draft.min_age,
        max_age: draft.max_age,
        max_distance_km: draft.max_distance_km,
        min_fame: draft.min_fame,
        max_fame: draft.max_fame,
      }),
    [
      draft.sort_by,
      draft.order,
      draft.min_age,
      draft.max_age,
      draft.max_distance_km,
      draft.min_fame,
      draft.max_fame,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = sanitizeBrowseFilters({
        ...draft,
        tags: appliedTagsRef.current,
      });
      const current = sanitizeBrowseFilters(filters);
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      onChange(next);
    }, AUTO_APPLY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [autoApplySnapshot, draft, filters, onChange]);

  const toggleTag = (tag: string) => {
    const current = draft.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setDraft({ ...draft, tags: next });
  };

  const applyTags = () => {
    const next = sanitizeBrowseFilters(draft);
    appliedTagsRef.current = next.tags ?? [];
    onChange(next);
  };

  const clearFilters = () => {
    const cleared: BrowseFiltersState = { sort_by: "distance" };
    setDraft(cleared);
    appliedTagsRef.current = [];
    onChange(cleared);
  };

  const distanceEnabled = draft.max_distance_km != null;
  const sliderValue = draft.max_distance_km ?? 50;

  return (
    <div className="space-y-6 rounded-lg border border-border/60 p-4">
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Sort results</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Sort by</Label>
            <Select
              value={draft.sort_by ?? "distance"}
              onValueChange={(value: SortBy) =>
                setDraft({ ...draft, sort_by: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Location</SelectItem>
                <SelectItem value="age">Age</SelectItem>
                <SelectItem value="fame">Fame rating</SelectItem>
                <SelectItem value="common_tags">Interest tags</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order</Label>
            <Select
              value={draft.order ?? "default"}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  order: value === "default" ? null : (value as SortOrder),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Filter results</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Age range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={18}
                placeholder="Min"
                value={draft.min_age ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    min_age: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <Input
                type="number"
                min={18}
                placeholder="Max"
                value={draft.max_age ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    max_age: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max distance (km)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-0 text-xs"
                onClick={() =>
                  setDraft({
                    ...draft,
                    max_distance_km: distanceEnabled ? null : 50,
                  })
                }
              >
                {distanceEnabled ? "Any distance" : "Set limit"}
              </Button>
            </div>
            {distanceEnabled ? (
              <div className="space-y-2 pt-1">
                <Slider
                  min={1}
                  max={500}
                  value={sliderValue}
                  onValueChange={(value) =>
                    setDraft({ ...draft, max_distance_km: value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Within {sliderValue} km of your location
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No distance limit applied
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fame rating range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Min"
                value={draft.min_fame ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    min_fame: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <Input
                type="number"
                min={0}
                placeholder="Max"
                value={draft.max_fame ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    max_fame: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Interest tags</Label>
        <div className="flex flex-wrap gap-2">
          {interests.map((tag) => {
            const selected = draft.tags?.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                #{tag.toLowerCase().replace(/\s+/g, "")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={applyTags}>
          Apply interest tags
        </Button>
        <Button type="button" variant="outline" onClick={clearFilters}>
          Clear all
        </Button>
      </div>
    </div>
  );
}
