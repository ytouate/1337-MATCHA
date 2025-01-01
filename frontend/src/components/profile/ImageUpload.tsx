"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, Star } from "lucide-react";
import { Input } from "../ui/input";

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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && images.length < 5) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex">
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
          id="image-upload"
        />
        <Button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            fileInputRef.current?.click();
          }}
          disabled={images.length >= 5}
        >
          Upload Image
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {images.map((img, index) => (
          <div key={index} className="relative group">
            <div className="relative w-full h-32">
              <Image
                src={img.preview}
                alt={`Uploaded ${index + 1}`}
                fill
                className="object-cover rounded-md"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
              >
                <X className="h-6 w-6 text-white" />
              </Button>
              {index !== profilePicture && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSetProfilePicture(index)}
                >
                  <Star className="h-6 w-6 text-white" />
                </Button>
              )}
            </div>
            {index === profilePicture && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Star className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
