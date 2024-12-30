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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSignin } from "@/hooks/auth/useSignin";
import { useRouter } from "next/navigation";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onForgotPassword: () => void;
}

export const Signin = ({ isOpen, onOpenChange, onForgotPassword }: Props) => {
  const router = useRouter();

  const form = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

  const signin = useSignin(() => {
    onOpenChange(false);
    router.push("/");
  });

  function onSubmit(values: z.infer<typeof signinSchema>) {
    signin.mutate(values);
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Dialog modal onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
        className="border-border max-h-[100vh] overflow-auto rounded-lg w-[95%]"
      >
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
                      <Input
                        placeholder="Enter your email or username"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="link"
                className="h-auto px-1 py-0 text-sm font-normal"
                onClick={onForgotPassword}
              >
                Forgot password?
              </Button>

              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  aria-label="Cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={signin.isPending}>
                  {signin.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
