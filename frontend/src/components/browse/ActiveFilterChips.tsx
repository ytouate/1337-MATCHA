"use client";

import type { SortBy } from "@/api/model";
import type { BrowseFiltersState } from "@/hooks/browse/useSuggestions";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const SORT_LABELS: Record<SortBy, string> = {
  distance: "Location",
  age: "Age",
  fame: "Fame",
  common_tags: "Shared interests",
};

interface ActiveFilterChipsProps {
  filters: BrowseFiltersState;
  onChange: (filters: BrowseFiltersState) => void;
}

export function ActiveFilterChips({ filters, onChange }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.sort_by && filters.sort_by !== "distance") {
    chips.push({
      key: "sort",
      label: `Sort: ${SORT_LABELS[filters.sort_by]}`,
      clear: () => onChange({ ...filters, sort_by: "distance", order: null }),
    });
  } else if (filters.order) {
    chips.push({
      key: "order",
      label: `Order: ${filters.order}`,
      clear: () => onChange({ ...filters, order: null }),
    });
  }

  if (filters.min_age != null) {
    chips.push({
      key: "min_age",
      label: `Min age ${filters.min_age}`,
      clear: () => onChange({ ...filters, min_age: null }),
    });
  }

  if (filters.max_age != null) {
    chips.push({
      key: "max_age",
      label: `Max age ${filters.max_age}`,
      clear: () => onChange({ ...filters, max_age: null }),
    });
  }

  if (filters.max_distance_km != null) {
    chips.push({
      key: "max_distance",
      label: `Within ${filters.max_distance_km} km`,
      clear: () => onChange({ ...filters, max_distance_km: null }),
    });
  }

  if (filters.min_fame != null) {
    chips.push({
      key: "min_fame",
      label: `Min fame ${filters.min_fame}`,
      clear: () => onChange({ ...filters, min_fame: null }),
    });
  }

  if (filters.max_fame != null) {
    chips.push({
      key: "max_fame",
      label: `Max fame ${filters.max_fame}`,
      clear: () => onChange({ ...filters, max_fame: null }),
    });
  }

  filters.tags?.forEach((tag) => {
    chips.push({
      key: `tag-${tag}`,
      label: `#${tag.toLowerCase().replace(/\s+/g, "")}`,
      clear: () =>
        onChange({
          ...filters,
          tags: filters.tags?.filter((t) => t !== tag),
        }),
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            className="rounded-sm p-0.5 hover:bg-muted"
            aria-label={`Remove ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
