import React from "react";
import { Button } from "../ui/button";
import { UseFormReturn } from "react-hook-form";
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  form: UseFormReturn<any>;
}

export const LocationUpdate = ({ form }: Props) => {
  const { toast } = useToast();

  const getIPBasedLocation = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      form.setValue("latitude", data.latitude);
      form.setValue("longitude", data.longitude);
      toast({
        title: "Location Updated",
        description: "Using approximate location based on IP address",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get location",
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
          title: "Location Updated",
          description: "Using your current location",
        });
      },
      async (error) => {
        await getIPBasedLocation();
      }
    );
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleGetLocation}
        className="w-full"
      >
        <MapPin className="mr-2 h-4 w-4" />
        Update Location
      </Button>
    </div>
  );
};
