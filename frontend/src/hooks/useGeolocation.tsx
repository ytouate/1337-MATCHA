import { useCallback, useState } from "react";
import {
  getPrecisePosition,
  isGeolocationPositionError,
  mapGeolocationError,
  type PrecisePositionResult,
} from "@/lib/geolocation";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (initial?: {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    accuracy: initial?.accuracy ?? null,
    error: null,
    loading: false,
  });

  const requestPreciseLocation = useCallback(async (): Promise<
    PrecisePositionResult | null
  > => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const position = await getPrecisePosition();
      setState({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        error: null,
        loading: false,
      });
      return position;
    } catch (error) {
      const message = isGeolocationPositionError(error)
        ? mapGeolocationError(error)
        : error instanceof Error
          ? error.message
          : "Failed to get location";

      setState((prev) => ({
        ...prev,
        error: message,
        loading: false,
      }));
      return null;
    }
  }, []);

  const updateLocation = useCallback(
    (latitude: number, longitude: number, accuracy?: number | null) => {
      setState({
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        error: null,
        loading: false,
      });
    },
    [],
  );

  return {
    ...state,
    updateLocation,
    requestPreciseLocation,
  };
};
