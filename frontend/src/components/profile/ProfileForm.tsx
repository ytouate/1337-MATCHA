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
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useToast } from "../../hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/profile/ImageUpload";
import { InterestsSelect } from "@/components/profile/InterestsSelect";
import { useAuthStore } from "@/store/auth";

const formSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  gender: z.enum(["Male", "Female"]),
  sexual_preference: z.enum(["Male", "Female"]),
  interests: z.array(z.string()).min(1, "Select at least 1 interest").max(5),
  images: z.array(z.instanceof(File)).min(1, "Add at least 1 image").max(5),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [profilePicture, setProfilePicture] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuthStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bio: "",
      gender: user?.gender || "Male",
      sexual_preference: user?.gender === "Male" ? "Female" : "Male",
      interests: [],
      images: [],
    },
  });

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

  const { mutate: completeProfile, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        }
      );

      const formData = new FormData();
      formData.append("bio", data.bio);
      formData.append("gender", data.gender);
      formData.append("sexual_preference", data.sexual_preference);
      formData.append("latitude", position.coords.latitude.toString());
      formData.append("longitude", position.coords.longitude.toString());
      formData.append(
        "profile_picture_index",
        profilePicture?.toString() || "0"
      );
      data.interests.forEach((interest) =>
        formData.append("interests", interest)
      );
      data.images.forEach((image) => formData.append("images", image));

      await axios.post("/api/profile/complete", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile completed",
        description: "Your profile has been successfully completed.",
      });
      router.push("/dashboard");
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
                    onValueChange={field.onChange}
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
