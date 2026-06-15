"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { PhotoGalleryManager } from "@/components/profile/PhotoGalleryManager";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useGetMe } from "@/hooks/auth/useGetMe";
import { useToast } from "@/hooks/use-toast";
import {
  getProfilePictureIndex,
  profileImagesToGalleryItems,
  saveGalleryImages,
  type GalleryImageItem,
} from "@/hooks/profile/useGallerySave";

export default function GalleryPage() {
  const { user } = useAuthStore();
  const { data: meProfile } = useGetMe();
  const profile = meProfile ?? user;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [profilePicture, setProfilePicture] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!profile || initialized) return;

    const existingImages = profileImagesToGalleryItems(profile.images);
    setImages(existingImages);

    setProfilePicture(
      getProfilePictureIndex(profile.images, profile.profile_picture)
    );
    setInitialized(true);
  }, [profile, initialized]);

  const saveGallery = useMutation({
    mutationFn: async () => {
      if (!profile?.username) {
        throw new Error("Not authenticated");
      }
      if (images.length < 1) {
        throw new Error("At least one image is required");
      }

      await saveGalleryImages(profile.username, images, profilePicture);
    },
    onSuccess: async () => {
      toast({
        title: "Gallery saved",
        description: "Your photos were updated.",
        variant: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not update your gallery. Please try again.",
        variant: "error",
      });
    },
  });

  return (
    <AuthenticatedLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Your photos</p>
            <h1 className="text-2xl font-semibold">Photo gallery</h1>
          </div>
          <Link href="/profile/edit" className="text-sm text-primary hover:underline">
            Back to profile
          </Link>
        </div>

        <PhotoGalleryManager
          images={images}
          onImagesChange={setImages}
          profilePicture={profilePicture}
          onSetProfilePicture={setProfilePicture}
        />

        <Button
          className="mt-8 w-full"
          disabled={saveGallery.isPending || images.length < 1}
          onClick={() => saveGallery.mutate()}
        >
          {saveGallery.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save gallery"
          )}
        </Button>
      </div>
    </AuthenticatedLayout>
  );
}
