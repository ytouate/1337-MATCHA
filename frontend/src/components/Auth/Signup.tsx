"use client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { signUpSchema } from "@/forms.validators";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gender } from "@/models";
import { DatePicker } from "../common/DatePicker";
import { useSignup } from "@/hooks/auth/useSignup";

export const Signup = ({
  setSignupModalOpen,
  setShowSuccessToast,
}: {
  setSignupModalOpen: (value: boolean) => void;
  setShowSuccessToast: (value: boolean) => void;
}) => {
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      birthdate: new Date(),
      gender: Gender.Male,
      password: "",
      confirmPassword: "",
    },
  });

  const signup = useSignup(() => {
    setShowSuccessToast(true);
    setSignupModalOpen(false);
  });

  function onSubmit(values: z.infer<typeof signUpSchema>) {
    signup.mutate({
      ...values,
      birthdate: values.birthdate.toISOString().split("T")[0],
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Join us at Matcha</DialogTitle>
        <DialogDescription>
          Connect with a vibrant community and explore endless opportunities.
          Start your journey with Matcha!
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex w-full justify-center space-x-2">
            {(["first_name", "last_name"] as const).map((name) => (
              <div className="flex-1" key={name}>
                <FormField
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {name === "first_name" ? "First Name" : "Last Name"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            name === "first_name" ? "Youssef" : "Touate"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="ytouate@matcha.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex w-full space-x-2">
            <div className="w-full">
              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Birthdate</FormLabel>
                      <FormControl {...field}>
                        <DatePicker
                          date={new Date(field.value)}
                          setDate={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            <div className="w-full">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === "") return;
                        field.onChange(value);
                      }}
                      {...field}
                    >
                      <FormControl>
                        <SelectTrigger className="flex w-full items-center justify-between rounded-md py-1.5 px-[15px] border border-border">
                          <SelectValue placeholder={"Custom message"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white bg-background border rounded">
                        <SelectItem
                          className="flex cursor-pointer items-center h-[25px] px-[35px] pl-[25px] relative"
                          value="Male"
                        >
                          Male
                        </SelectItem>
                        <SelectItem
                          className="flex cursor-pointer items-center h-[25px] px-[35px] pl-[25px] relative"
                          value="Female"
                        >
                          Female
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {(["password", "confirmPassword"] as const).map((name) => (
            <div className="flex-1" key={name}>
              <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {name === "password" ? "Password" : "Confirm Password"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="********"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setSignupModalOpen(false)}
              variant="outline"
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button disabled={signup.isPending} type="submit">
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
