"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { socialApi } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileImage } from "@/components/profile/ProfileImage";

interface Connection {
  username: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
  fame_rating?: number;
  is_online?: boolean;
}

export default function ChatPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () =>
      (await socialApi.getMyConnectionsApiUsersMeConnectionsGet()) as {
        connections: Connection[];
      },
  });

  const connections = data?.connections ?? [];

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with users you are connected with.
        </p>

        <div className="mt-8 space-y-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}

          {!isLoading && connections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No connections yet. Like profiles that like you back to connect.
            </p>
          )}

          {connections.map((connection) => (
            <Link
              key={connection.username}
              href={`/chat/${connection.username}`}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
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
              <div>
                <p className="font-medium">
                  {connection.first_name} {connection.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{connection.username}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
