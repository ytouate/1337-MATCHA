"use client";

import Image from "next/image";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: { file: File; preview: string }[];
  onUpload: (file: File) => void;
  onRemove: (index: number) => void;
  onSetProfilePicture: (index: number) => void;
  profilePicture: number | null;
}

export function ImageUpload({
  images,
  onUpload,
  onRemove,
  onSetProfilePicture,
  profilePicture,
}: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = 5 - images.length;
      acceptedFiles.slice(0, remaining).forEach(onUpload);
    },
    [images.length, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".gif"] },
    maxFiles: 5 - images.length,
    disabled: images.length >= 5,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 transition-colors",
          isDragActive
            ? "border-foreground/30 bg-muted/40"
            : "border-border hover:bg-muted/30",
          images.length >= 5 && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-foreground">
          {isDragActive ? "Drop photos here" : "Add photos"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag and drop or click to browse · up to 5
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.map((img, index) => (
            <div
              key={index}
              className={cn(
                "group relative overflow-hidden rounded-lg",
                index === profilePicture && "ring-1 ring-foreground/20"
              )}
            >
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={img.preview}
                  alt={`Uploaded ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>

              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-background hover:bg-background/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                {index !== profilePicture && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-background hover:bg-background/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetProfilePicture(index);
                    }}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {index === profilePicture && (
                <span className="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
