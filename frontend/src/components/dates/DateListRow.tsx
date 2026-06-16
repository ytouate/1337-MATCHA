"use client";

import type { DateProposalResponse } from "@/api/model";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatScheduledAt,
  getDateStatusClassName,
  getDateStatusLabel,
  getPeerDisplayName,
} from "@/lib/datePresentation";
import Link from "next/link";
import { useState } from "react";

type DateListRowProps = {
  date: DateProposalResponse;
  statusLabel?: string;
  showWithdraw?: boolean;
  onWithdraw?: (dateId: number) => void | Promise<void>;
  withdrawLoading?: boolean;
};

export function DateListRow({
  date,
  statusLabel,
  showWithdraw = false,
  onWithdraw,
  withdrawLoading = false,
}: DateListRowProps) {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const label = statusLabel ?? getDateStatusLabel(date.status);

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
        <Link
          href={`/dates/${date.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:opacity-80"
        >
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
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
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{getPeerDisplayName(date.peer)}</p>
              <Badge className={getDateStatusClassName(date.status)}>
                {label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatScheduledAt(date.scheduled_at)}
            </p>
            {date.location_label && (
              <p className="truncate text-xs text-muted-foreground">
                {date.location_label}
              </p>
            )}
          </div>
        </Link>
        {showWithdraw && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
            disabled={withdrawLoading}
          >
            Withdraw
          </Button>
        )}
      </div>
      {showWithdraw && (
        <ConfirmDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          title="Withdraw date request?"
          description="Your proposal will be cancelled and removed from their pending list."
          confirmLabel="Withdraw"
          variant="destructive"
          loading={withdrawLoading}
          onConfirm={() => onWithdraw?.(date.id)}
        />
      )}
    </>
  );
}
