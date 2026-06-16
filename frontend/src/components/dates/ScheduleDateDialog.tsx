"use client";

import { datesApi, locationApi } from "@/api/client";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addHours } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const scheduleDateSchema = z.object({
  scheduled_at: z.date().refine((value) => value > new Date(), {
    message: "Pick a future date and time",
  }),
  venueQuery: z.string().max(128).optional(),
  location_label: z.string().max(128).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

type ScheduleDateValues = z.infer<typeof scheduleDateSchema>;

interface ScheduleDateDialogProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleDateDialog({
  username,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleDateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm<ScheduleDateValues>({
    resolver: zodResolver(scheduleDateSchema),
    defaultValues: {
      scheduled_at: addHours(new Date(), 24),
      venueQuery: "",
      location_label: null,
      latitude: null,
      longitude: null,
      note: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ScheduleDateValues) => {
      return datesApi.createDateProposalApiDatesPost({
        username,
        scheduled_at: values.scheduled_at.toISOString(),
        location_label: values.location_label,
        latitude: values.latitude,
        longitude: values.longitude,
        note: values.note?.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dates"] });
      toast({
        title: "Date proposed",
        description: `Your date with @${username} was sent.`,
        variant: "success",
      });
      form.reset({
        scheduled_at: addHours(new Date(), 24),
        venueQuery: "",
        location_label: null,
        latitude: null,
        longitude: null,
        note: "",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Could not propose date",
        description:
          "Make sure you are connected and have no pending proposal.",
        variant: "error",
      });
    },
  });

  const handleGeocode = async () => {
    const query = form.getValues("venueQuery")?.trim();
    if (!query) return;

    setIsGeocoding(true);
    try {
      const result = await locationApi.geocodeLocationApiLocationGeocodePost({
        query,
      });
      form.setValue("location_label", result.label);
      form.setValue("latitude", result.latitude);
      form.setValue("longitude", result.longitude);
      toast({
        title: "Venue saved",
        description: result.label,
        variant: "success",
      });
    } catch {
      toast({
        title: "Venue not found",
        description: "Try a place name or address.",
        variant: "error",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = (values: ScheduleDateValues) => {
    createMutation.mutate(values);
  };

  return (
    <Modal modalOpen={open} setModalOpen={onOpenChange}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Plan a date</h2>
          <p className="text-sm text-muted-foreground">
            Propose a meetup with @{username}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venueQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue (optional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} placeholder="Cafe, park, address..." />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeocode}
                      disabled={isGeocoding || !field.value?.trim()}
                    >
                      {isGeocoding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Find"
                      )}
                    </Button>
                  </div>
                  {form.watch("location_label") && (
                    <p className="text-xs text-muted-foreground">
                      {form.watch("location_label")}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Anything your match should know"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Sending..." : "Send proposal"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Modal>
  );
}
