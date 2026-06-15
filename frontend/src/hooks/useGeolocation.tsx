import { useState, useEffect } from "react";
import { useToast } from "./use-toast";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });
  const { toast } = useToast();

  const getIPBasedLocation = async () => {
    try {
      // Using ipapi.co for IP-based geolocation
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      setState({
        latitude: data.latitude,
        longitude: data.longitude,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to get location",
        loading: false,
      }));
    }
  };

  const getBrowserLocation = () => {
    if (!navigator.geolocation) {
      getIPBasedLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      async (error) => {
        // If user denies permission, fall back to IP-based geolocation
        toast({
          title: "Location access denied",
          description: "Using approximate location based on IP address",
          variant: "default",
        });
        await getIPBasedLocation();
      }
    );
  };

  useEffect(() => {
    getBrowserLocation();
  }, []);

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
