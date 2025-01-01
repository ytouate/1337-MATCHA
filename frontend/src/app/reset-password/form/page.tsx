"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { appAPI } from "@/utils/axios";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(32, "Password must not exceed 32 characters")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/[a-z]/, "Password must include at least one lowercase letter")
      .regex(/\d/, "Password must include at least one number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must include at least one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  async function onSubmit(values: ResetPasswordForm) {
    try {
      await appAPI.api.resetPasswordApiAuthResetPasswordTokenPost(token!, {
        new_password: values.newPassword,
      });
      toast({
        title: "Success",
        description: "Your password has been reset successfully.",
        variant: "success",
      });
      router.push("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "error",
      });
    }
  }

  if (!token) return null;

  return (
    <div className="container max-w-md mx-auto mt-10 p-6 bg-background rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
        Reset Your Password
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">New Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="********"
                    className="text-foreground placeholder:text-muted-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  Confirm Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="********"
                    className="text-foreground placeholder:text-muted-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Reset Password
          </Button>
        </form>
      </Form>
    </div>
  );
}
