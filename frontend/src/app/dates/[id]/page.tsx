"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canCancel,
  isPendingInvite,
  isPendingSent,
  useDateDetail,
  useDateMutations,
} from "@/hooks/dates/useDates";
import { useToast } from "@/hooks/use-toast";
import {
  formatScheduledAt,
  getDateStatusClassName,
  getDateStatusLabel,
  getPeerDisplayName,
  getSentDateStatusLabel,
} from "@/lib/datePresentation";

export default function DateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dateId = Number(params?.id);
  const { data: date, isLoading, isError } = useDateDetail(dateId);
  const { acceptMutation, declineMutation, cancelMutation } = useDateMutations();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(dateId);
      toast({
        title: "Date accepted",
        description: "You're all set for this meetup.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Could not accept date",
        variant: "error",
      });
    }
  };

  const handleDecline = async () => {
    try {
      await declineMutation.mutateAsync(dateId);
      toast({ title: "Date declined", variant: "default" });
      router.push("/dates");
    } catch {
      toast({
        title: "Could not decline date",
        variant: "error",
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(dateId);
      toast({ title: "Date cancelled", variant: "default" });
      router.push("/dates");
    } catch {
      toast({
        title: "Could not cancel date",
        variant: "error",
      });
    }
  };

  const handleWithdraw = async () => {
    try {
      await cancelMutation.mutateAsync(dateId);
      toast({ title: "Date request withdrawn", variant: "default" });
      router.push("/dates");
    } catch {
      toast({
        title: "Could not withdraw date request",
        variant: "error",
      });
    }
  };

  const getStatusLabel = () => {
    if (!date) return "";
    if (isPendingSent(date)) return getSentDateStatusLabel();
    return getDateStatusLabel(date.status);
  };

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link href="/dates" className="text-sm text-primary hover:underline">
          Back to dates
        </Link>

        {isLoading && (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {isError && (
          <p className="mt-6 text-sm text-muted-foreground">Date not found.</p>
        )}

        {date && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted">
                {date.peer.profile_picture ? (
                  <ProfileImage
                    src={date.peer.profile_picture}
                    alt={date.peer.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-medium">
                    {date.peer.first_name[0]}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  {getPeerDisplayName(date.peer)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  @{date.peer.username}
                </p>
              </div>
              <Badge className={`ml-auto ${getDateStatusClassName(date.status)}`}>
                {getStatusLabel()}
              </Badge>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="text-sm font-medium">When</p>
                  <p className="text-sm text-muted-foreground">
                    {formatScheduledAt(date.scheduled_at)}
                  </p>
                </div>
                {date.location_label && (
                  <div>
                    <p className="text-sm font-medium">Where</p>
                    <p className="text-sm text-muted-foreground">
                      {date.location_label}
                    </p>
                  </div>
                )}
                {date.note && (
                  <div>
                    <p className="text-sm font-medium">Note</p>
                    <p className="text-sm text-muted-foreground">{date.note}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              {isPendingInvite(date) && (
                <>
                  <Button
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    disabled={declineMutation.isPending}
                  >
                    Decline
                  </Button>
                </>
              )}
              {isPendingSent(date) && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setWithdrawOpen(true)}
                    disabled={cancelMutation.isPending}
                  >
                    Withdraw request
                  </Button>
                  <ConfirmDialog
                    open={withdrawOpen}
                    onOpenChange={setWithdrawOpen}
                    title="Withdraw date request?"
                    description="Your proposal will be cancelled and removed from their pending list."
                    confirmLabel="Withdraw"
                    variant="destructive"
                    loading={cancelMutation.isPending}
                    onConfirm={handleWithdraw}
                  />
                </>
              )}
              {canCancel(date) && !isPendingSent(date) && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setCancelOpen(true)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel date
                  </Button>
                  <ConfirmDialog
                    open={cancelOpen}
                    onOpenChange={setCancelOpen}
                    title="Cancel this date?"
                    description="This will cancel the scheduled meetup for both of you."
                    confirmLabel="Cancel date"
                    variant="destructive"
                    loading={cancelMutation.isPending}
                    onConfirm={handleCancel}
                  />
                </>
              )}
              <Button variant="ghost" asChild>
                <Link href={`/chat/${date.peer.username}`}>Open chat</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
