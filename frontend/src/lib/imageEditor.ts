import type { Area } from "react-easy-crop";

export type ImageFilter = "original" | "grayscale" | "sepia" | "bright";
export type AspectRatioPreset = "free" | "1:1" | "3:4";

export function aspectRatioValue(
  preset: AspectRatioPreset,
): number | undefined {
  switch (preset) {
    case "1:1":
      return 1;
    case "3:4":
      return 3 / 4;
    default:
      return undefined;
  }
}

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Failed to load image")),
    );
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function applyFilter(
  ctx: CanvasRenderingContext2D,
  filter: ImageFilter,
  width: number,
  height: number,
) {
  if (filter === "original") return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (filter === "grayscale") {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    } else if (filter === "sepia") {
      data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
    } else if (filter === "bright") {
      data[i] = Math.min(255, r * 1.15 + 10);
      data[i + 1] = Math.min(255, g * 1.15 + 10);
      data[i + 2] = Math.min(255, b * 1.15 + 10);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function renderCroppedImageFile(
  image: Pick<HTMLImageElement, "width" | "height">,
  pixelCrop: Area,
  rotation = 0,
  filter: ImageFilter = "original",
  fileName = "photo.jpg",
): Promise<File> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not supported");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image as CanvasImageSource, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Canvas is not supported");
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  applyFilter(croppedCtx, filter, pixelCrop.width, pixelCrop.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Failed to export image"));
          return;
        }
        resolve(result);
      },
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], fileName, { type: "image/jpeg" });
}

export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  filter: ImageFilter = "original",
  fileName = "photo.jpg",
): Promise<File> {
  const image = await loadImage(imageSrc);
  return renderCroppedImageFile(image, pixelCrop, rotation, filter, fileName);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
