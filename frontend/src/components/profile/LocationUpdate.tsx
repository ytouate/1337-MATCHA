"use client";

import { useEffect, useRef, useState } from "react";
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
import { geocodeQuerySchema } from "@/forms.validators";
import { cn } from "@/lib/utils";

const GPS_CONSENT_KEY = "matcha-gps-consent";

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
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showGpsConsent, setShowGpsConsent] = useState(false);
  const [hasStoredConsent, setHasStoredConsent] = useState(false);
  const {
    accuracy,
    loading: isRequestingGps,
    requestPreciseLocation,
    updateLocation,
  } = useGeolocation({ latitude, longitude });
  const hasLocation = latitude !== null && longitude !== null;

  useEffect(() => {
    setHasStoredConsent(localStorage.getItem(GPS_CONSENT_KEY) === "1");
  }, []);

  const focusManualInput = () => {
    manualInputRef.current?.focus();
    manualInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const requestGpsAfterConsent = async () => {
    localStorage.setItem(GPS_CONSENT_KEY, "1");
    setHasStoredConsent(true);
    setShowGpsConsent(false);

    const position = await requestPreciseLocation();
    if (!position) {
      toast({
        title: "Location access denied",
        description: "Enter your city or neighborhood manually below.",
        variant: "default",
      });
      focusManualInput();
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

  const handleGpsButtonClick = () => {
    if (hasStoredConsent) {
      void requestGpsAfterConsent();
      return;
    }
    setShowGpsConsent(true);
  };

  const handleManualGeocode = async () => {
    const parsed = geocodeQuerySchema.safeParse(manualQuery);
    if (!parsed.success) {
      toast({
        title: "Invalid location",
        description: parsed.error.issues[0]?.message ?? "Enter a valid location.",
        variant: "error",
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await locationApi.geocodeLocationApiLocationGeocodePost({
        query: parsed.data,
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

      {showGpsConsent && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="text-sm font-medium">Use GPS for your location?</p>
          <p className="text-xs text-muted-foreground">
            We store your coordinates for matching. Other users see approximate
            distance and a fuzzed map pin — never your exact address.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void requestGpsAfterConsent()}>
              Use GPS
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowGpsConsent(false);
                focusManualInput();
              }}
            >
              Enter manually
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleGpsButtonClick}
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
        GPS uses high-accuracy mode in your browser only after you choose to
        allow it above.
      </p>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <p className="text-sm font-medium">Or enter manually</p>
        <p className="text-xs text-muted-foreground">
          City or neighborhood if GPS is unavailable
        </p>
        <div className="flex gap-2">
          <Input
            ref={manualInputRef}
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
