"use client";

import { datesApi } from "@/api/client";
import type { DateProposalResponse } from "@/api/model";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDateList(upcoming = false) {
  return useQuery({
    queryKey: ["dates", { upcoming }],
    queryFn: async () => {
      const response = await datesApi.listDateProposalsApiDatesGet(
        upcoming ? { upcoming: true } : undefined,
      );
      return response.dates;
    },
  });
}

export function useDateDetail(dateId: number) {
  return useQuery({
    queryKey: ["dates", dateId],
    queryFn: () => datesApi.getDateProposalApiDatesDateIdGet(dateId),
    enabled: Number.isFinite(dateId) && dateId > 0,
  });
}

export function useDateMutations() {
  const queryClient = useQueryClient();

  const invalidate = (dateId?: number) => {
    queryClient.invalidateQueries({ queryKey: ["dates"] });
    if (dateId) {
      queryClient.invalidateQueries({ queryKey: ["dates", dateId] });
    }
  };

  const acceptMutation = useMutation({
    mutationFn: (dateId: number) =>
      datesApi.acceptDateProposalApiDatesDateIdAcceptPost(dateId),
    onSuccess: (data) => invalidate(data.id),
  });

  const declineMutation = useMutation({
    mutationFn: (dateId: number) =>
      datesApi.declineDateProposalApiDatesDateIdDeclinePost(dateId),
    onSuccess: (data) => invalidate(data.id),
  });

  const cancelMutation = useMutation({
    mutationFn: (dateId: number) =>
      datesApi.cancelDateProposalApiDatesDateIdCancelPost(dateId),
    onSuccess: (data) => invalidate(data.id),
  });

  return {
    acceptMutation,
    declineMutation,
    cancelMutation,
  };
}

export function isPendingInvite(date: DateProposalResponse): boolean {
  return date.status === "proposed" && !date.is_mine;
}

export function isPendingSent(date: DateProposalResponse): boolean {
  return date.status === "proposed" && date.is_mine;
}

export function canCancel(date: DateProposalResponse): boolean {
  return date.status === "proposed" || date.status === "accepted";
}
