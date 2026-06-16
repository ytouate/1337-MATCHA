"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { socialApi } from "@/api/client";
import { ScheduleDateDialog } from "@/components/dates/ScheduleDateDialog";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface Connection {
  username: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
  fame_rating?: number;
  is_online?: boolean;
}

interface ConnectionListProps {
  showActions?: boolean;
  emptyMessage?: string;
}

export function ConnectionList({
  showActions = false,
  emptyMessage = "No connections yet. Like profiles that like you back to connect.",
}: ConnectionListProps) {
  const [planDateUsername, setPlanDateUsername] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () =>
      (await socialApi.getMyConnectionsApiUsersMeConnectionsGet()) as {
        connections: Connection[];
      },
  });

  const connections = data?.connections ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {connections.map((connection) => (
          <div
            key={connection.username}
            className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center"
          >
            <Link
              href={`/chat/${connection.username}`}
              className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:opacity-80"
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                {connection.profile_picture ? (
                  <ProfileImage
                    src={connection.profile_picture}
                    alt={connection.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-medium">
                    {connection.first_name[0]}
                  </div>
                )}
                {connection.is_online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium">
                  {connection.first_name} {connection.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{connection.username}
                </p>
              </div>
            </Link>

            {showActions && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/chat/${connection.username}`}>
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Message
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPlanDateUsername(connection.username)}
                >
                  <CalendarHeart className="mr-1.5 h-4 w-4" />
                  Plan date
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {planDateUsername && (
        <ScheduleDateDialog
          username={planDateUsername}
          open={Boolean(planDateUsername)}
          onOpenChange={(open) => {
            if (!open) setPlanDateUsername(null);
          }}
        />
      )}
    </>
  );
}
