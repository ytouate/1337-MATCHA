"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { locationApi } from "@/api/client";
import {
  formatAccuracyMeters,
  isLowGpsAccuracy,
} from "@/lib/geolocation";
import { cn } from "@/lib/utils";

interface Props {
  form: UseFormReturn<any>;
  latitude: number | null;
  longitude: number | null;
  locationLabel?: string | null;
  onGpsUpdate?: (latitude: number, longitude: number) => void;
}

export const LocationUpdate = ({
  form,
  latitude,
  longitude,
  locationLabel,
  onGpsUpdate,
}: Props) => {
  const { toast } = useToast();
  const [manualQuery, setManualQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const {
    accuracy,
    loading: isRequestingGps,
    requestPreciseLocation,
    updateLocation,
  } = useGeolocation({ latitude, longitude });
  const hasLocation = latitude !== null && longitude !== null;

  const handleGetLocation = async () => {
    const position = await requestPreciseLocation();
    if (!position) {
      toast({
        title: "Location access denied",
        description: "Enter your city or neighborhood manually below.",
        variant: "default",
      });
      return;
    }

    form.setValue("latitude", position.latitude);
    form.setValue("longitude", position.longitude);
    form.setValue("location_label", null);
    onGpsUpdate?.(position.latitude, position.longitude);

    const accuracyLabel = formatAccuracyMeters(position.accuracy);
    toast({
      title: "Location updated",
      description: isLowGpsAccuracy(position.accuracy)
        ? `Saved with ${accuracyLabel}. Low GPS accuracy — try again outdoors or use manual entry.`
        : `Using your current GPS location (${accuracyLabel})`,
      variant: isLowGpsAccuracy(position.accuracy) ? "default" : "success",
    });
  };

  const handleManualGeocode = async () => {
    if (!manualQuery.trim()) return;

    setIsGeocoding(true);
    try {
      const result = await locationApi.geocodeLocationApiLocationGeocodePost({
        query: manualQuery.trim(),
      });
      form.setValue("latitude", result.latitude);
      form.setValue("longitude", result.longitude);
      form.setValue("location_label", result.label);
      updateLocation(result.latitude, result.longitude, null);
      onGpsUpdate?.(result.latitude, result.longitude);
      toast({
        title: "Location saved",
        description: result.label,
        variant: "success",
      });
    } catch {
      toast({
        title: "Location not found",
        description: "Try a city or neighborhood name.",
        variant: "error",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const locationSummary = hasLocation
    ? locationLabel ||
      (accuracy != null
        ? `GPS location saved ${formatAccuracyMeters(accuracy)}`
        : "Location saved")
    : "Location required for nearby matching";

  return (
    <div className="space-y-4">
      <p
        className={cn(
          "text-sm",
          hasLocation ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {locationSummary}
      </p>

      {hasLocation && accuracy != null && isLowGpsAccuracy(accuracy) && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Low GPS accuracy — try again outdoors or use manual entry.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleGetLocation}
        disabled={isRequestingGps}
        className="w-full"
      >
        {isRequestingGps ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting precise location...
          </>
        ) : hasLocation ? (
          "Update GPS location"
        ) : (
          "Use GPS location"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        GPS uses high-accuracy mode in your browser after you tap the button
        above.
      </p>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <p className="text-sm font-medium">Or enter manually</p>
        <p className="text-xs text-muted-foreground">
          City or neighborhood if GPS is unavailable
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Paris 11e, Brooklyn"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleManualGeocode();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleManualGeocode}
            disabled={isGeocoding || !manualQuery.trim()}
          >
            {isGeocoding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Find"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
