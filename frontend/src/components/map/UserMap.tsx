"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { SuggestedProfile } from "@/api/model";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import "leaflet/dist/leaflet.css";

const DEFAULT_ZOOM = 12;

const userMarkerIcon = L.divIcon({
  className: "",
  html: '<div class="h-3 w-3 rounded-full border-2 border-white bg-primary shadow-md"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const viewerMarkerIcon = L.divIcon({
  className: "",
  html: '<div class="h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-md"></div>',
  iconAnchor: [8, 8],
  iconSize: [16, 16],
});

interface UserMapProps {
  profiles: SuggestedProfile[];
  viewerLatitude?: number | null;
  viewerLongitude?: number | null;
  isLoading?: boolean;
  isMissingLocation?: boolean;
  isError?: boolean;
  total?: number;
}

function FitMapBounds({
  positions,
}: {
  positions: Array<[number, number]>;
}) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;

    if (positions.length === 1) {
      map.setView(positions[0], DEFAULT_ZOOM);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] });
  }, [map, positions]);

  return null;
}

function MapPopupContent({ profile }: { profile: SuggestedProfile }) {
  return (
    <div className="min-w-[180px] space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
          {profile.profile_picture ? (
            <ProfileImage
              src={profile.profile_picture}
              alt={`${profile.first_name} ${profile.last_name}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
              {profile.first_name[0]}
            </div>
          )}
        </div>
        <div>
          <p className="font-medium leading-tight">
            {profile.first_name}, {profile.age}
          </p>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
        </div>
      </div>
      {profile.distance_km != null && (
        <p className="text-xs text-muted-foreground">
          {profile.distance_km.toFixed(1)} km away
        </p>
      )}
      {profile.location_label && (
        <p className="text-xs text-muted-foreground">
          Near {profile.location_label}
        </p>
      )}
      <Button asChild size="sm" className="w-full">
        <Link href={`/profile/${profile.username}`}>View profile</Link>
      </Button>
    </div>
  );
}

export function UserMap({
  profiles,
  viewerLatitude,
  viewerLongitude,
  isLoading = false,
  isMissingLocation = false,
  isError = false,
  total = 0,
}: UserMapProps) {
  const mappableProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          profile.map_latitude != null && profile.map_longitude != null,
      ),
    [profiles],
  );

  const positions = useMemo(() => {
    const points: Array<[number, number]> = mappableProfiles.map((profile) => [
      profile.map_latitude!,
      profile.map_longitude!,
    ]);

    if (viewerLatitude != null && viewerLongitude != null) {
      points.push([viewerLatitude, viewerLongitude]);
    }

    return points;
  }, [mappableProfiles, viewerLatitude, viewerLongitude]);

  const center = useMemo<[number, number]>(() => {
    if (viewerLatitude != null && viewerLongitude != null) {
      return [viewerLatitude, viewerLongitude];
    }

    if (positions.length > 0) {
      return positions[0];
    }

    return [48.8566, 2.3522];
  }, [positions, viewerLatitude, viewerLongitude]);

  if (isLoading) {
    return <Skeleton className="h-[min(50dvh,480px)] md:h-[min(70vh,720px)] w-full rounded-lg" />;
  }

  if (isMissingLocation) {
    return (
      <div className="flex h-[min(50dvh,480px)] md:h-[min(70vh,720px)] items-center justify-center rounded-lg border border-dashed border-border/60 px-6 py-16 text-center">
        <div>
          <p className="text-sm font-medium">Set your location to use the map</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The map centers on your saved location and shows nearby profiles.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/profile/edit">Update location in profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[min(50dvh,480px)] md:h-[min(70vh,720px)] items-center justify-center rounded-lg border border-dashed border-destructive/40 px-6 py-16 text-center">
        <div>
          <p className="text-sm font-medium">Could not load map results</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your filters and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {total} profile{total === 1 ? "" : "s"} on map
        {mappableProfiles.length < profiles.length
          ? ` · ${mappableProfiles.length} with map positions`
          : ""}
      </p>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-[min(50dvh,480px)] md:h-[min(70vh,720px)] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMapBounds positions={positions} />
          {viewerLatitude != null && viewerLongitude != null && (
            <Marker
              position={[viewerLatitude, viewerLongitude]}
              icon={viewerMarkerIcon}
            >
              <Popup>
                <p className="text-sm font-medium">You</p>
              </Popup>
            </Marker>
          )}
          {mappableProfiles.map((profile) => (
            <Marker
              key={profile.username}
              position={[profile.map_latitude!, profile.map_longitude!]}
              icon={userMarkerIcon}
            >
              <Popup>
                <MapPopupContent profile={profile} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
