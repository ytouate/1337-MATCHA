import { afterEach, describe, expect, it, vi } from "vitest";
import { aspectRatioValue, renderCroppedImageFile } from "./imageEditor";

describe("imageEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps aspect ratio presets", () => {
    expect(aspectRatioValue("1:1")).toBe(1);
    expect(aspectRatioValue("3:4")).toBeCloseTo(0.75);
    expect(aspectRatioValue("free")).toBeUndefined();
  });

  it("exports a JPEG file after crop, rotate, and filter", async () => {
    const mockImageData = new Uint8ClampedArray(4 * 10 * 10);
    const image = { width: 100, height: 80 };

    const ctx = {
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: mockImageData,
        width: 10,
        height: 10,
      })),
      putImageData: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function toBlob(
        this: HTMLCanvasElement,
        callback: BlobCallback,
        type?: string
      ) {
        callback(new Blob(["jpeg"], { type: type ?? "image/jpeg" }));
      }
    );

    const file = await renderCroppedImageFile(
      image,
      { x: 0, y: 0, width: 10, height: 10 },
      90,
      "grayscale",
      "edited.jpg"
    );

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("edited.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(ctx.getImageData).toHaveBeenCalled();
  });
});
