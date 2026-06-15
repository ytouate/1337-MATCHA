import { uploadApi, usersApi } from "@/api/client";
import type { UserUpdate } from "@/api/model";
import { getImageUrl, toStoredImagePath } from "@/lib/utils";

export interface GalleryImageItem {
  file?: File;
  preview: string;
  existingPath?: string;
}

type ProfileImageSource =
  | string
  | {
      url: string;
      is_profile_picture?: boolean;
    };

export function profileImagesToGalleryItems(
  images?: ProfileImageSource[]
): GalleryImageItem[] {
  if (!images) return [];

  return images.map((image) => {
    const url = typeof image === "string" ? image : image.url;
    return {
      preview: getImageUrl(url),
      existingPath: toStoredImagePath(url),
    };
  });
}

export function getProfilePictureIndex(
  images?: ProfileImageSource[],
  profilePicture?: string | null
): number | null {
  if (!images?.length) return null;

  if (typeof images[0] !== "string") {
    const index = images.findIndex(
      (image) => typeof image !== "string" && image.is_profile_picture
    );
    return index >= 0 ? index : null;
  }

  if (profilePicture) {
    const normalizedProfilePicture = toStoredImagePath(profilePicture);
    const index = images.findIndex((image) => {
      const path = toStoredImagePath(
        typeof image === "string" ? image : image.url
      );
      return path === normalizedProfilePicture;
    });
    return index >= 0 ? index : 0;
  }

  return 0;
}

export function buildImagePaths(
  images: GalleryImageItem[],
  uploadedPaths: string[]
): string[] {
  let uploadIndex = 0;

  return images.map((image) => {
    if (image.existingPath) {
      return image.existingPath;
    }

    const path = uploadedPaths[uploadIndex];
    uploadIndex += 1;
    return path;
  });
}

export async function saveGalleryImages(
  username: string,
  images: GalleryImageItem[],
  profilePictureIndex: number | null,
  extraPatch?: Partial<UserUpdate>
): Promise<void> {
  const newFiles = images
    .filter((image) => image.file)
    .map((image) => image.file!);

  let uploadedPaths: string[] = [];

  if (newFiles.length > 0) {
    const uploadResponse = (await uploadApi.uploadFilesApiUploadPost({
      files: newFiles,
    })) as Array<{ url: string }>;
    uploadedPaths = uploadResponse.map((file) => file.url);
  }

  const imagePaths = buildImagePaths(images, uploadedPaths);
  const picIndex = profilePictureIndex ?? 0;

  await usersApi.partialUpdateUserApiUsersUsernamePatch(username, {
    ...extraPatch,
    images: imagePaths,
    profile_picture: imagePaths[picIndex],
  });
}
