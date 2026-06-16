"use client";

import type { ReactNode } from "react";
import type { DateProposalResponse } from "@/api/model";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { QueryErrorState } from "@/components/common/QueryErrorState";
import { DateListRow } from "@/components/dates/DateListRow";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isPendingSent,
  useDateList,
  useDateMutations,
} from "@/hooks/dates/useDates";
import { useToast } from "@/hooks/use-toast";
import { getSentDateStatusLabel } from "@/lib/datePresentation";

function DateSection({
  title,
  description,
  dates,
  emptyMessage,
  renderRow,
}: {
  title: string;
  description: string;
  dates: DateProposalResponse[];
  emptyMessage: string;
  renderRow: (date: DateProposalResponse) => ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {dates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {dates.map((date) => (
            <div key={date.id}>{renderRow(date)}</div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DatesPage() {
  const { toast } = useToast();
  const {
    data: upcoming = [],
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
  } = useDateList(true);
  const {
    data: allDates = [],
    isLoading: allLoading,
    isError: allError,
    refetch: refetchAll,
  } = useDateList(false);
  const { cancelMutation } = useDateMutations();

  const pending = allDates.filter(
    (date) => date.status === "proposed" && !date.is_mine,
  );
  const sent = allDates.filter(isPendingSent);
  const isLoading = upcomingLoading || allLoading;
  const isError = upcomingError || allError;

  const handleRetry = () => {
    void refetchUpcoming();
    void refetchAll();
  };

  const handleWithdraw = async (dateId: number) => {
    try {
      await cancelMutation.mutateAsync(dateId);
      toast({ title: "Date request withdrawn", variant: "default" });
    } catch {
      toast({
        title: "Could not withdraw date request",
        variant: "error",
      });
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold">Dates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming meetups and proposals awaiting your response.
        </p>

        <div className="mt-8 space-y-10">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}

          {!isLoading && isError && (
            <QueryErrorState
              title="Could not load dates"
              description="We couldn't fetch your date proposals right now."
              onRetry={handleRetry}
            />
          )}

          {!isLoading && !isError && (
            <>
              <DateSection
                title="Pending"
                description="Proposals waiting for your answer"
                dates={pending}
                emptyMessage="No pending proposals."
                renderRow={(date) => <DateListRow date={date} />}
              />
              <DateSection
                title="Sent"
                description="Proposals you sent that are awaiting a response"
                dates={sent}
                emptyMessage="No sent proposals."
                renderRow={(date) => (
                  <DateListRow
                    date={date}
                    statusLabel={getSentDateStatusLabel()}
                    showWithdraw
                    onWithdraw={handleWithdraw}
                    withdrawLoading={cancelMutation.isPending}
                  />
                )}
              />
              <DateSection
                title="Upcoming"
                description="Confirmed dates with your connections"
                dates={upcoming}
                emptyMessage="No upcoming dates yet."
                renderRow={(date) => <DateListRow date={date} />}
              />
            </>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
