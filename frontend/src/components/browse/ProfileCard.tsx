"use client";

import Link from "next/link";
import { uniqueStrings } from "@/lib/uniqueStrings";
import { Heart } from "lucide-react";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SuggestedProfile } from "@/api/model";

interface ProfileCardProps {
  profile: SuggestedProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-none transition-colors hover:border-border">
      <Link href={`/profile/${profile.username}`}>
        <div className="relative aspect-[3/4] bg-muted">
          {profile.profile_picture ? (
            <ProfileImage
              src={profile.profile_picture}
              alt={`${profile.first_name} ${profile.last_name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-semibold text-muted-foreground">
              {profile.first_name[0]}
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium leading-tight">
                {profile.first_name}, {profile.age}
              </h3>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              <Heart className="mr-1 h-3 w-3" />
              {profile.fame_rating ?? 0}
            </Badge>
          </div>

          {profile.distance_km != null && (
            <p className="text-xs text-muted-foreground">
              {profile.distance_km.toFixed(1)} km away
            </p>
          )}

          {profile.common_interest_count ? (
            <p className="text-xs text-muted-foreground">
              {profile.common_interest_count} shared interest
              {profile.common_interest_count > 1 ? "s" : ""}
            </p>
          ) : null}

          {profile.common_interests && profile.common_interests.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {uniqueStrings(profile.common_interests).slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  #{tag.toLowerCase().replace(/\s+/g, "")}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
