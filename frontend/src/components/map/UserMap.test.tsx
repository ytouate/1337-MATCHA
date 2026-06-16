import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SuggestedProfile } from "@/api/model";
import { UserMap } from "./UserMap";

vi.mock("leaflet/dist/leaflet.css", () => ({}));

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
  }),
}));

const profiles: SuggestedProfile[] = [
  {
    username: "alice",
    first_name: "Alice",
    last_name: "Smith",
    age: 24,
    distance_km: 3.2,
    location_label: "Paris",
    map_latitude: 48.86,
    map_longitude: 2.35,
  },
  {
    username: "bob",
    first_name: "Bob",
    last_name: "Jones",
    age: 27,
    distance_km: 5.1,
    location_label: "Paris",
    map_latitude: 48.87,
    map_longitude: 2.36,
  },
];

describe("UserMap", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders markers for profiles with map coordinates", () => {
    render(
      <UserMap
        profiles={profiles}
        viewerLatitude={48.8566}
        viewerLongitude={2.3522}
        total={2}
      />,
    );

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getAllByTestId("map-marker")).toHaveLength(3);
    expect(screen.getByText("2 profiles on map")).toBeInTheDocument();
  });

  it("shows missing-location message", () => {
    render(<UserMap profiles={[]} isMissingLocation />);

    expect(
      screen.getByText("Set your location to use the map"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("map-container")).not.toBeInTheDocument();
  });
});
