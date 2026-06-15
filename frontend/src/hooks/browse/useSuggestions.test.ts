import { describe, expect, it } from "vitest";
import { sanitizeBrowseFilters } from "@/hooks/browse/useSuggestions";

describe("sanitizeBrowseFilters", () => {
  it("strips invalid distance values", () => {
    expect(
      sanitizeBrowseFilters({ max_distance_km: 0 }).max_distance_km
    ).toBeNull();
    expect(
      sanitizeBrowseFilters({ max_distance_km: -5 }).max_distance_km
    ).toBeNull();
    expect(
      sanitizeBrowseFilters({ max_distance_km: 50 }).max_distance_km
    ).toBe(50);
  });

  it("strips invalid age values", () => {
    expect(sanitizeBrowseFilters({ min_age: 17 }).min_age).toBeNull();
    expect(sanitizeBrowseFilters({ max_age: 121 }).max_age).toBeNull();
    expect(sanitizeBrowseFilters({ min_age: 25, max_age: 35 }).min_age).toBe(
      25
    );
    expect(sanitizeBrowseFilters({ min_age: 25, max_age: 35 }).max_age).toBe(
      35
    );
  });

  it("allows zero fame and strips negative fame", () => {
    expect(sanitizeBrowseFilters({ min_fame: 0 }).min_fame).toBe(0);
    expect(sanitizeBrowseFilters({ min_fame: -1 }).min_fame).toBeNull();
  });
});
