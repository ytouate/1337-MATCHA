"use client";

import { Button } from "@/components/ui/button";
import React from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { signinSchema } from "@/forms.validators";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSignin } from "@/hooks/auth/useSignin";
import { useRouter } from "next/navigation";

export const Signin = ({
  setSigninModalOpen,
}: {
  setSigninModalOpen: (value: boolean) => void;
}) => {
  const router = useRouter();
  
  const form = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

  const signin = useSignin(() => {
    setSigninModalOpen(false);
    router.push("/");
  });

  function onSubmit(values: z.infer<typeof signinSchema>) {
    signin.mutate(values);
  }

  return (
    <DialogHeader>
      <DialogTitle>Welcome back</DialogTitle>
      <DialogDescription>
        Connect with a vibrant community and explore endless opportunities.
        Start your journey with Matcha!
      </DialogDescription>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or Username</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email or username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setSigninModalOpen(false)}
              variant="outline"
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={signin.isPending}
            >
              {signin.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogHeader>
  );
};
