import { useState } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (initial?: {
  latitude?: number | null;
  longitude?: number | null;
}) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    error: null,
    loading: false,
  });

  const getBrowserLocation = () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      }
    );
  };

  const updateLocation = (latitude: number, longitude: number) => {
    setState({
      latitude,
      longitude,
      error: null,
      loading: false,
    });
  };

  return {
    ...state,
    updateLocation,
    getBrowserLocation,
  };
};
