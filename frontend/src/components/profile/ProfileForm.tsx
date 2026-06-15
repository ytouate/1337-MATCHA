"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useToast } from "../../hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/profile/ImageUpload";
import { InterestsSelect } from "@/components/profile/InterestsSelect";
import { useAuthStore } from "@/store/auth";
import { uploadApi, usersApi } from "@/api/client";
import { Gender } from "@/api/model";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { LocationUpdate } from "./LocationUpdate";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useEffect } from "react";

const formSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters"),
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

  useEffect(() => {
    if (latitude && longitude) {
      form.setValue("latitude", latitude);
      form.setValue("longitude", longitude);
    }
  }, [latitude, longitude, form]);

  const handleImageUpload = (file: File) => {
    if (images.length >= 5) {
      toast({
        title: "Error",
        description: "You can only upload up to 5 images",
        variant: "error",
      });
      return;
    }
    const preview = URL.createObjectURL(file);
    setImages((prev) => [...prev, { file, preview }]);
    const newImages = [...form.getValues("images"), file];
    form.setValue("images", newImages);
  };

  const handleImageRemove = (index: number) => {
    URL.revokeObjectURL(images[index].preview);
    setImages((prev) => prev.filter((_, i) => i !== index));
    const newImages = form.getValues("images").filter((_, i) => i !== index);
    form.setValue("images", newImages);
    if (profilePicture === index) {
      setProfilePicture(null);
    } else if (profilePicture !== null && profilePicture > index) {
      setProfilePicture(profilePicture - 1);
    }
  };

  const queryClient = useQueryClient();
  const { mutate: completeProfile, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      // First, upload the images
      const imageFormData = new FormData();
      data.images.forEach((image) => imageFormData.append("files", image));

      const uploadResponse = (await uploadApi.uploadFilesApiUploadPost({
        files: data.images,
      })) as { url: string }[];

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
        description: "Your profile has been successfully completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: () => {
      toast({
        title: "Error",
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
    <div className="max-w-md mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about yourself..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
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
                  <FormLabel>Sexual Preference</FormLabel>
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

          <FormField
            control={form.control}
            name="images"
            render={() => (
              <FormItem>
                <FormLabel>Images</FormLabel>
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Location</h3>
              <span className="text-sm text-muted-foreground">
                Required for matching with nearby users
              </span>
            </div>
            <LocationUpdate form={form} />
          </div>

          <Button
            onClick={form.handleSubmit(onSubmit)}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "Completing profile..." : "Complete Profile"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
