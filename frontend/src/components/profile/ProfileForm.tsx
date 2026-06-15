"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ImageUpload,
  type ProfileImageItem,
} from "@/components/profile/ImageUpload";
import { InterestsSelect } from "@/components/profile/InterestsSelect";
import { LocationUpdate } from "@/components/profile/LocationUpdate";
import { useAuthStore } from "@/store/auth";
import { uploadApi, usersApi } from "@/api/client";
import { Gender } from "@/api/model";
import type { UserProfileResponse } from "@/api/model";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { useGetMe } from "@/hooks/auth/useGetMe";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl, toStoredImagePath } from "@/lib/utils";

const formSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(255),
  gender: z.enum(["Male", "Female"]),
  sexual_preference: z.enum(["Male", "Female"]),
  interests: z.array(z.string()).min(1, "Select at least 1 interest").max(5),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  location_label: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProfileFormProps {
  mode?: "complete" | "edit";
}

export function ProfileForm({ mode = "complete" }: ProfileFormProps) {
  const [images, setImages] = useState<ProfileImageItem[]>([]);
  const [profilePicture, setProfilePicture] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(mode === "complete");
  const { toast } = useToast();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: meProfile } = useGetMe();

  const profile = (meProfile ?? user) as UserProfileResponse | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bio: "",
      gender: "Male",
      sexual_preference: "Female",
      interests: [],
      latitude: null,
      longitude: null,
      location_label: null,
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !profile || initialized) return;

    form.reset({
      bio: profile.bio || "",
      gender: (profile.gender as "Male" | "Female") || "Male",
      sexual_preference:
        (profile.sexual_preference as "Male" | "Female") || "Female",
      interests: profile.interests || [],
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
      location_label: profile.location_label ?? null,
    });

    const existingImages: ProfileImageItem[] = (profile.images || []).map(
      (img) => ({
        preview: getImageUrl(img.url),
        existingPath: toStoredImagePath(img.url),
      })
    );
    setImages(existingImages);

    const profilePicIndex = (profile.images || []).findIndex(
      (img) => img.is_profile_picture
    );
    setProfilePicture(profilePicIndex >= 0 ? profilePicIndex : null);
    setInitialized(true);
  }, [mode, profile, initialized, form]);

  useEffect(() => {
    if (mode === "complete" && user) {
      form.setValue("gender", (user.gender as "Male" | "Female") || "Male");
      if (user.sexual_preference) {
        form.setValue(
          "sexual_preference",
          user.sexual_preference as "Male" | "Female"
        );
      }
      if (user.latitude != null) form.setValue("latitude", user.latitude);
      if (user.longitude != null) form.setValue("longitude", user.longitude);
    }
  }, [mode, user, form]);

  const watched = form.watch();

  const completionSteps = useMemo(
    () => [
      watched.bio.length >= 10,
      images.length >= 1,
      watched.interests.length >= 1,
      watched.latitude !== null && watched.longitude !== null,
    ],
    [watched, images.length]
  );

  const completedCount = completionSteps.filter(Boolean).length;
  const progressPercent = (completedCount / completionSteps.length) * 100;

  const handleImageUpload = (file: File) => {
    if (images.length >= 5) {
      toast({
        title: "Limit reached",
        description: "You can only upload up to 5 images",
        variant: "error",
      });
      return;
    }
    const preview = URL.createObjectURL(file);
    setImages((prev) => [...prev, { file, preview }]);
  };

  const handleImageRemove = (index: number) => {
    const removed = images[index];
    if (removed.file) {
      URL.revokeObjectURL(removed.preview);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (profilePicture === index) {
      setProfilePicture(null);
    } else if (profilePicture !== null && profilePicture > index) {
      setProfilePicture(profilePicture - 1);
    }
  };

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      if (images.length < 1) {
        throw new Error("At least one image is required");
      }

      const newFiles = images.filter((img) => img.file).map((img) => img.file!);
      let uploadedPaths: string[] = [];

      if (newFiles.length > 0) {
        const uploadResponse = (await uploadApi.uploadFilesApiUploadPost({
          files: newFiles,
        })) as Array<{ url: string }>;
        uploadedPaths = uploadResponse.map((file) => file.url);
      }

      let uploadIndex = 0;
      const imagePaths = images.map((img) => {
        if (img.existingPath) return img.existingPath;
        const path = uploadedPaths[uploadIndex];
        uploadIndex += 1;
        return path;
      });

      const picIndex = profilePicture ?? 0;
      const profilePicturePath = imagePaths[picIndex];

      await usersApi.partialUpdateUserApiUsersUsernamePatch(
        user?.username || "",
        {
          bio: data.bio,
          gender: data.gender as Gender,
          sexual_preference: data.sexual_preference as Gender,
          interests: data.interests,
          images: imagePaths,
          profile_picture: profilePicturePath,
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          location_label: data.location_label ?? undefined,
        }
      );
    },
    onSuccess: async () => {
      toast({
        title: mode === "complete" ? "Profile completed" : "Profile updated",
        description: mode === "complete" ? "You're all set." : "Changes saved.",
        variant: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      if (mode === "complete") {
        router.replace("/");
      }
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Failed to save profile. Please try again.",
        variant: "error",
      });
    },
  });

  function onSubmit(values: FormValues) {
    if (images.length < 1) {
      toast({
        title: "Photo required",
        description: "Add at least one photo.",
        variant: "error",
      });
      return;
    }
    if (profilePicture === null) {
      setProfilePicture(0);
    }
    saveProfile(values);
  }

  useAuthCheck();

  const genderDisabled = mode === "complete";

  return (
    <div className="space-y-8">
      {mode === "complete" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>
              {completedCount} of {completionSteps.length}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/70 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">About you</CardTitle>
              <CardDescription>
                A short bio and your basic preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Coffee lover, night owl, always up for a hike..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/255 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={genderDisabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sexual_preference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interested in</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Men</SelectItem>
                          <SelectItem value="Female">Women</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Photos</CardTitle>
              <CardDescription>
                Add 1–5 photos. Mark one as your main profile picture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                images={images}
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
                onSetProfilePicture={setProfilePicture}
                profilePicture={profilePicture}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Interests</CardTitle>
              <CardDescription>Choose up to 5.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <InterestsSelect
                        selectedInterests={field.value || []}
                        onInterestsChange={field.onChange}
                        maxInterests={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Location</CardTitle>
              <CardDescription>
                Used for nearby matching. Your exact location is not shared.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationUpdate
                form={form}
                latitude={watched.latitude}
                longitude={watched.longitude}
                locationLabel={watched.location_label}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : mode === "complete" ? (
              "Complete profile"
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
