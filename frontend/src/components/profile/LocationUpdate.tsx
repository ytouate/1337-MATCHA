"use client";

import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  form: UseFormReturn<any>;
  latitude: number | null;
  longitude: number | null;
}

export const LocationUpdate = ({ form, latitude, longitude }: Props) => {
  const { toast } = useToast();
  const hasLocation = latitude !== null && longitude !== null;

  const getIPBasedLocation = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      form.setValue("latitude", data.latitude);
      form.setValue("longitude", data.longitude);
      toast({
        title: "Location updated",
        description: "Using approximate location based on your IP address",
        variant: "success",
      });
    } catch {
      toast({
        title: "Could not get location",
        description: "Please try again or check your connection",
        variant: "error",
      });
    }
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      await getIPBasedLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("latitude", position.coords.latitude);
        form.setValue("longitude", position.coords.longitude);
        toast({
          title: "Location updated",
          description: "Using your current GPS location",
          variant: "success",
        });
      },
      async () => {
        await getIPBasedLocation();
      }
    );
  };

  return (
    <div className="space-y-3">
      <p
        className={cn(
          "text-sm",
          hasLocation ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {hasLocation
          ? "Location saved"
          : "Location required for nearby matching"}
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={handleGetLocation}
        className="w-full"
      >
        {hasLocation ? "Update location" : "Use current location"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Uses GPS when available, otherwise an approximate location from your
        network.
      </p>
    </div>
  );
};
