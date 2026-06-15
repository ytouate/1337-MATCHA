"use client";

import { useEffect, useState } from "react";
import { ProfileImage } from "@/components/profile/ProfileImage";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export interface GalleryPhoto {
  url: string;
  is_profile_picture?: boolean;
}

interface PhotoGalleryViewerProps {
  photos: GalleryPhoto[];
  initialIndex?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showGrid?: boolean;
}

export function PhotoGalleryViewer({
  photos,
  initialIndex = 0,
  open: controlledOpen,
  onOpenChange,
  showGrid = true,
}: PhotoGalleryViewerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      setActiveIndex(carouselApi.selectedScrollSnap());
    };

    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (open && carouselApi) {
      carouselApi.scrollTo(initialIndex, true);
      setActiveIndex(initialIndex);
    }
  }, [open, initialIndex, carouselApi]);

  if (photos.length === 0) {
    return null;
  }

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  return (
    <>
      {showGrid && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <button
              key={`${photo.url}-${index}`}
              type="button"
              onClick={() => openAt(index)}
              className={cn(
                "relative aspect-[3/4] overflow-hidden rounded-lg bg-muted text-left",
                photo.is_profile_picture && "ring-1 ring-primary/40"
              )}
            >
              <ProfileImage
                src={photo.url}
                alt="Profile photo"
                fill
                className="object-cover"
              />
              {photo.is_profile_picture && (
                <span className="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                  Main
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Photo gallery</DialogTitle>
          <Carousel setApi={setCarouselApi} className="w-full">
            <CarouselContent>
              {photos.map((photo, index) => (
                <CarouselItem key={`${photo.url}-${index}`}>
                  <div className="relative aspect-[3/4] w-full bg-black">
                    <ProfileImage
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
          <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
            {activeIndex + 1} / {photos.length}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function usePhotoGalleryViewer() {
  const [open, setOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const openGallery = (index = 0) => {
    setInitialIndex(index);
    setOpen(true);
  };

  return { open, setOpen, initialIndex, openGallery };
}
