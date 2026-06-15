"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { ImageEditorModal } from "@/components/profile/ImageEditorModal";
import { cn } from "@/lib/utils";
import { fileToDataUrl } from "@/lib/imageEditor";
import type { GalleryImageItem } from "@/hooks/profile/useGallerySave";

export type { GalleryImageItem };

interface PhotoGalleryManagerProps {
  images: GalleryImageItem[];
  onImagesChange: (images: GalleryImageItem[]) => void;
  profilePicture: number | null;
  onSetProfilePicture: (index: number | null) => void;
}

interface SortablePhotoProps {
  image: GalleryImageItem;
  index: number;
  isProfilePicture: boolean;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onSetProfilePicture: (index: number | null) => void;
}

function SortablePhoto({
  image,
  index,
  isProfilePicture,
  onRemove,
  onEdit,
  onSetProfilePicture,
}: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: `${image.preview}-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-lg",
        isProfilePicture && "ring-1 ring-foreground/20"
      )}
    >
      <div className="relative aspect-[3/4] w-full">
        {image.preview.startsWith("blob:") ||
        image.preview.startsWith("data:") ? (
          <Image
            src={image.preview}
            alt={`Photo ${index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
            unoptimized
          />
        ) : (
          <ProfileImage
            src={image.preview}
            alt={`Photo ${index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        )}
      </div>

      <button
        type="button"
        className="absolute left-2 top-2 rounded-md bg-background/90 p-1 text-muted-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-background hover:bg-background/20"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(index);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-background hover:bg-background/20"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        {!isProfilePicture && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-background hover:bg-background/20"
            onClick={(event) => {
              event.stopPropagation();
              onSetProfilePicture(index);
            }}
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isProfilePicture && (
        <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
          Main
        </span>
      )}
    </div>
  );
}

export function PhotoGalleryManager({
  images,
  onImagesChange,
  profilePicture,
  onSetProfilePicture,
}: PhotoGalleryManagerProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const openEditorForFile = async (file: File, index: number | null) => {
    const dataUrl = await fileToDataUrl(file);
    setEditingIndex(index);
    setEditorSrc(dataUrl);
    setEditorOpen(true);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = 5 - images.length;
      const file = acceptedFiles[0];
      if (file && remaining > 0) {
        void openEditorForFile(file, null);
      }
    },
    [images.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".gif"] },
    maxFiles: 5 - images.length,
    disabled: images.length >= 5,
    noClick: editorOpen,
  });

  const handleRemove = (index: number) => {
    const removed = images[index];
    if (removed.file || removed.preview.startsWith("blob:")) {
      URL.revokeObjectURL(removed.preview);
    }

    const nextImages = images.filter((_, i) => i !== index);
    onImagesChange(nextImages);

    if (profilePicture === index) {
      onSetProfilePicture(nextImages.length > 0 ? 0 : null);
    } else if (profilePicture !== null && profilePicture > index) {
      onSetProfilePicture(profilePicture - 1);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex(
      (image, index) => `${image.preview}-${index}` === active.id
    );
    const newIndex = images.findIndex(
      (image, index) => `${image.preview}-${index}` === over.id
    );

    if (oldIndex < 0 || newIndex < 0) return;

    onImagesChange(arrayMove(images, oldIndex, newIndex));

    if (profilePicture === oldIndex) {
      onSetProfilePicture(newIndex);
    } else if (profilePicture !== null) {
      if (oldIndex < profilePicture && newIndex >= profilePicture) {
        onSetProfilePicture(profilePicture - 1);
      } else if (oldIndex > profilePicture && newIndex <= profilePicture) {
        onSetProfilePicture(profilePicture + 1);
      }
    }
  };

  const handleEditorSave = (file: File, previewUrl: string) => {
    if (editingIndex !== null) {
      const previous = images[editingIndex];
      if (
        previous.preview.startsWith("blob:") &&
        previous.preview !== previewUrl
      ) {
        URL.revokeObjectURL(previous.preview);
      }

      onImagesChange(
        images.map((image, index) =>
          index === editingIndex
            ? { file, preview: previewUrl, existingPath: undefined }
            : image
        )
      );
    } else {
      onImagesChange([...images, { file, preview: previewUrl }]);
    }

    setEditingIndex(null);
    setEditorSrc(null);
  };

  const sortableIds = images.map((image, index) => `${image.preview}-${index}`);

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
          Drag and drop or click to browse · up to 5 · edit before adding
        </p>
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {images.map((image, index) => (
                <SortablePhoto
                  key={`${image.preview}-${index}`}
                  image={image}
                  index={index}
                  isProfilePicture={index === profilePicture}
                  onRemove={handleRemove}
                  onEdit={(editIndex) => {
                    const target = images[editIndex];
                    if (target.file) {
                      void openEditorForFile(target.file, editIndex);
                      return;
                    }
                    setEditingIndex(editIndex);
                    setEditorSrc(target.preview);
                    setEditorOpen(true);
                  }}
                  onSetProfilePicture={onSetProfilePicture}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ImageEditorModal
        open={editorOpen}
        imageSrc={editorSrc}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditingIndex(null);
            setEditorSrc(null);
          }
        }}
        onSave={handleEditorSave}
      />
    </div>
  );
}
