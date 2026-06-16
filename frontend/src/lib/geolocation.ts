export const PRECISE_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

export const PRECISE_GEOLOCATION_REFINE_MS = 10_000;
export const PRECISE_GEOLOCATION_TARGET_ACCURACY_M = 50;

export interface PrecisePositionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function mapGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied";
    case error.POSITION_UNAVAILABLE:
      return "Location unavailable";
    case error.TIMEOUT:
      return "Location request timed out";
    default:
      return error.message || "Failed to get location";
  }
}

function toPreciseResult(position: GeolocationPosition): PrecisePositionResult {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

export function isGeolocationPositionError(
  error: unknown,
): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    typeof (error as GeolocationPositionError).code === "number"
  );
}

function getCurrentPosition(
  geolocation: Geolocation,
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function getPrecisePosition(
  geolocation: Geolocation = navigator.geolocation,
  refineMs: number = PRECISE_GEOLOCATION_REFINE_MS,
  targetAccuracyM: number = PRECISE_GEOLOCATION_TARGET_ACCURACY_M,
): Promise<PrecisePositionResult> {
  if (!geolocation) {
    throw new Error("Geolocation is not supported by your browser");
  }

  return new Promise((resolve, reject) => {
    let best: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let settled = false;

    const finish = (position: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      if (watchId != null) {
        geolocation.clearWatch(watchId);
      }
      clearTimeout(deadline);
      resolve(toPreciseResult(position));
    };

    const fail = async (error: GeolocationPositionError) => {
      if (settled) return;

      if (best) {
        finish(best);
        return;
      }

      try {
        const fallback = await getCurrentPosition(
          geolocation,
          PRECISE_GEOLOCATION_OPTIONS,
        );
        finish(fallback);
      } catch (fallbackError) {
        if (settled) return;
        settled = true;
        if (watchId != null) {
          geolocation.clearWatch(watchId);
        }
        clearTimeout(deadline);
        reject(
          isGeolocationPositionError(fallbackError) ? fallbackError : error,
        );
      }
    };

    const onPosition = (position: GeolocationPosition) => {
      if (!best || position.coords.accuracy < best.coords.accuracy) {
        best = position;
      }

      if (position.coords.accuracy <= targetAccuracyM) {
        finish(position);
      }
    };

    const deadline = setTimeout(() => {
      if (settled) return;

      if (best) {
        finish(best);
        return;
      }

      void (async () => {
        try {
          const fallback = await getCurrentPosition(
            geolocation,
            PRECISE_GEOLOCATION_OPTIONS,
          );
          finish(fallback);
        } catch (error) {
          if (settled) return;
          settled = true;
          if (watchId != null) {
            geolocation.clearWatch(watchId);
          }
          reject(error);
        }
      })();
    }, refineMs);

    watchId = geolocation.watchPosition(
      onPosition,
      (error) => {
        void fail(error);
      },
      PRECISE_GEOLOCATION_OPTIONS,
    );
  });
}

export function formatAccuracyMeters(accuracy: number): string {
  const rounded = Math.round(accuracy);
  return `±${rounded} m`;
}

export function isLowGpsAccuracy(accuracy: number | null | undefined): boolean {
  return accuracy != null && accuracy > 500;
}
