"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> {
  value: number;
  onValueChange: (value: number) => void;
}

export function Slider({
  className,
  value,
  onValueChange,
  min = 1,
  max = 500,
  step = 1,
  ...props
}: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary",
        className
      )}
      {...props}
    />
  );
}
