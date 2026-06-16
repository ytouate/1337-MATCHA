"use client";

import { usersApi } from "@/api/client";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { identitySchema } from "@/forms.validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

type IdentityValues = z.infer<typeof identitySchema>;

export function IdentityForm() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      });
    }
  }, [user, form]);

  const { mutate: saveIdentity, isPending } = useMutation({
    mutationFn: async (data: IdentityValues) => {
      if (!user) return;

      const payload: {
        first_name?: string;
        last_name?: string;
        email?: string;
      } = {};

      if (data.first_name !== user.first_name) {
        payload.first_name = data.first_name;
      }
      if (data.last_name !== user.last_name) {
        payload.last_name = data.last_name;
      }
      if (data.email !== user.email) {
        payload.email = data.email;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("NO_CHANGES");
      }

      await usersApi.partialUpdateUserApiUsersUsernamePatch(
        user.username,
        payload,
      );
    },
    onSuccess: (_data, variables) => {
      const emailChanged = user && variables.email !== user.email;
      toast({
        title: "Identity updated",
        description: emailChanged
          ? "Your email was updated. Please verify your new address."
          : "Your name has been saved.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (error: Error) => {
      if (error.message === "NO_CHANGES") {
        toast({
          title: "No changes",
          description: "Update a field before saving.",
          variant: "default",
        });
        return;
      }
      toast({
        title: "Update failed",
        description: "Could not update your identity information.",
        variant: "error",
      });
    },
  });

  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Identity</CardTitle>
        <CardDescription>
          Update your name or email. Re-verification is only required if you
          change your email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => saveIdentity(values))}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save identity"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
