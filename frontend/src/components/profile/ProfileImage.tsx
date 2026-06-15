"use client";

import Image, { type ImageProps } from "next/image";
import { getImageUrl } from "@/lib/utils";

type ProfileImageProps = Omit<ImageProps, "src" | "unoptimized"> & {
  src: string | null | undefined;
};

export function ProfileImage({ src, alt, ...props }: ProfileImageProps) {
  if (!src) return null;

  return (
    <Image
      {...props}
      src={getImageUrl(src)}
      alt={alt}
      unoptimized
    />
  );
}
