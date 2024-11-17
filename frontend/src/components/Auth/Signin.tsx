import { Button } from "@/components/ui/button";
import React from "react";

import {
  Form,
  FormControl,
  FormDescription,
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

export const Signin = ({
  setSigninModalOpen,
}: {
  setSigninModalOpen: (value: boolean) => void;
}) => {
  const form = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof signinSchema>) {
    console.log(values);
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
          {/* Login Field */}
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel>login</FormLabel>
                <FormControl>
                  <Input placeholder="login" {...field} />
                </FormControl>
                <FormDescription>Enter your email or username</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <div className="flex-1">
            <FormField
              control={form.control}
              name={"password"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setSigninModalOpen(false)}
              variant="outline"
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Form>
    </DialogHeader>
  );
};
