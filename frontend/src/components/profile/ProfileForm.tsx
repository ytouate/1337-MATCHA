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
import { ImageUpload } from "@/components/profile/ImageUpload";
import { InterestsSelect } from "@/components/profile/InterestsSelect";
import { LocationUpdate } from "@/components/profile/LocationUpdate";
import { useAuthStore } from "@/store/auth";
import { uploadApi, usersApi } from "@/api/client";
import { Gender } from "@/api/model";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(500),
  gender: z.enum(["Male", "Female"]),
  sexual_preference: z.enum(["Male", "Female"]),
  interests: z.array(z.string()).min(1, "Select at least 1 interest").max(5),
  images: z.array(z.instanceof(File)).min(1, "Add at least 1 image").max(5),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [profilePicture, setProfilePicture] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();
  const router = useRouter();
  const { latitude, longitude } = useGeolocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bio: "",
      gender: user?.gender || "Male",
      sexual_preference: user?.gender === "Male" ? "Female" : "Male",
      interests: [],
      images: [],
      latitude: user?.latitude || null,
      longitude: user?.longitude || null,
    },
  });

  const watched = form.watch();

  useEffect(() => {
    if (latitude && longitude) {
      form.setValue("latitude", latitude);
      form.setValue("longitude", longitude);
    }
  }, [latitude, longitude, form]);

  const completionSteps = useMemo(
    () => [
      watched.bio.length >= 10,
      watched.images.length >= 1,
      watched.interests.length >= 1,
      watched.latitude !== null && watched.longitude !== null,
    ],
    [watched]
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
    form.setValue("images", [...form.getValues("images"), file]);
  };

  const handleImageRemove = (index: number) => {
    URL.revokeObjectURL(images[index].preview);
    setImages((prev) => prev.filter((_, i) => i !== index));
    form.setValue(
      "images",
      form.getValues("images").filter((_, i) => i !== index)
    );
    if (profilePicture === index) {
      setProfilePicture(null);
    } else if (profilePicture !== null && profilePicture > index) {
      setProfilePicture(profilePicture - 1);
    }
  };

  const queryClient = useQueryClient();
  const { mutate: completeProfile, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      const uploadResponse = (await uploadApi.uploadFilesApiUploadPost({
        files: data.images,
      })) as Array<{ url: string }>;

      await usersApi.partialUpdateUserApiUsersUsernamePatch(
        user?.username || "",
        {
          bio: data.bio,
          gender: data.gender as Gender,
          sexual_preference: data.sexual_preference,
          interests: data.interests,
          images: uploadResponse.map((file) => `/api/images/${file.url}`),
          profile_picture: uploadResponse[profilePicture || 0]?.url
            ? `/api/images/${uploadResponse[profilePicture || 0].url}`
            : undefined,
          latitude: data.latitude,
          longitude: data.longitude,
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Profile completed",
        description: "You're all set.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace("/");
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Failed to complete profile. Please try again.",
        variant: "error",
      });
    },
  });

  function onSubmit(values: FormValues) {
    if (profilePicture === null && values.images.length > 0) {
      setProfilePicture(0);
    }
    completeProfile(values);
  }

  useAuthCheck();

  return (
    <div className="space-y-8">
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
                      {field.value.length}/500 characters
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue(
                            "sexual_preference",
                            value === "Male" ? "Female" : "Male"
                          );
                        }}
                        defaultValue={field.value}
                        disabled
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
                        defaultValue={field.value}
                        disabled
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your preference" />
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
              <FormField
                control={form.control}
                name="images"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        images={images}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                        onSetProfilePicture={setProfilePicture}
                        profilePicture={profilePicture}
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
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Complete profile"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
