import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadApi, usersApi } from "@/api/client";
import {
  buildImagePaths,
  getProfilePictureIndex,
  profileImagesToGalleryItems,
  saveGalleryImages,
  type GalleryImageItem,
} from "./useGallerySave";

vi.mock("@/api/client", () => ({
  uploadApi: {
    uploadFilesApiUploadPost: vi.fn(),
  },
  usersApi: {
    partialUpdateUserApiUsersUsernamePatch: vi.fn(),
  },
}));

describe("useGallerySave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps profile images into gallery items", () => {
    expect(
      profileImagesToGalleryItems([
        { url: "user/a.jpg", is_profile_picture: true },
        "user/b.jpg",
      ])
    ).toEqual([
      { preview: expect.any(String), existingPath: "user/a.jpg" },
      { preview: expect.any(String), existingPath: "user/b.jpg" },
    ]);
  });

  it("resolves profile picture index from structured or string images", () => {
    expect(
      getProfilePictureIndex(
        [{ url: "user/a.jpg" }, { url: "user/b.jpg", is_profile_picture: true }]
      )
    ).toBe(1);
    expect(
      getProfilePictureIndex(["user/a.jpg", "user/b.jpg"], "user/b.jpg")
    ).toBe(1);
  });

  it("buildImagePaths preserves existing paths and inserts uploaded paths in order", () => {
    const images: GalleryImageItem[] = [
      { preview: "a", existingPath: "user/a.jpg" },
      { preview: "b", file: new File(["b"], "b.jpg", { type: "image/jpeg" }) },
      { preview: "c", existingPath: "user/c.jpg" },
      { preview: "d", file: new File(["d"], "d.jpg", { type: "image/jpeg" }) },
    ];

    expect(buildImagePaths(images, ["user/new-b.jpg", "user/new-d.jpg"])).toEqual([
      "user/a.jpg",
      "user/new-b.jpg",
      "user/c.jpg",
      "user/new-d.jpg",
    ]);
  });

  it("uploads new files and patches user with ordered images and profile picture", async () => {
    vi.mocked(uploadApi.uploadFilesApiUploadPost).mockResolvedValue([
      { url: "user/new.jpg" },
    ] as never);
    vi.mocked(usersApi.partialUpdateUserApiUsersUsernamePatch).mockResolvedValue(
      {} as never
    );

    const images: GalleryImageItem[] = [
      { preview: "old", existingPath: "user/old.jpg" },
      {
        preview: "new",
        file: new File(["new"], "new.jpg", { type: "image/jpeg" }),
      },
    ];

    await saveGalleryImages("alice", images, 1);

    expect(uploadApi.uploadFilesApiUploadPost).toHaveBeenCalledWith({
      files: [images[1].file],
    });
    expect(usersApi.partialUpdateUserApiUsersUsernamePatch).toHaveBeenCalledWith(
      "alice",
      {
        images: ["user/old.jpg", "user/new.jpg"],
        profile_picture: "user/new.jpg",
      }
    );
  });

  it("defaults profile picture to the first image when index is null", async () => {
    vi.mocked(usersApi.partialUpdateUserApiUsersUsernamePatch).mockResolvedValue(
      {} as never
    );

    const images: GalleryImageItem[] = [
      { preview: "only", existingPath: "user/only.jpg" },
    ];

    await saveGalleryImages("alice", images, null);

    expect(usersApi.partialUpdateUserApiUsersUsernamePatch).toHaveBeenCalledWith(
      "alice",
      {
        images: ["user/only.jpg"],
        profile_picture: "user/only.jpg",
      }
    );
  });
});
