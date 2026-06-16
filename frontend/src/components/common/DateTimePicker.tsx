"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  format,
  getMonth,
  getYear,
  setHours,
  setMinutes,
  setMonth,
  setYear,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  minDate = new Date(),
}: DateTimePickerProps) {
  const startYear = getYear(minDate);
  const endYear = startYear + 2;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i,
  );

  const timeValue = format(value, "HH:mm");

  const handleMonthChange = (month: string) => {
    onChange(setMonth(value, months.indexOf(month)));
  };

  const handleYearChange = (year: string) => {
    onChange(setYear(value, Number.parseInt(year, 10)));
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(
        setMinutes(
          setHours(selectedDate, value.getHours()),
          value.getMinutes(),
        ),
      );
    }
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
    onChange(setMinutes(setHours(value, hours), minutes));
  };

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value, "PPP")}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex justify-between p-2">
            <Select
              onValueChange={handleMonthChange}
              value={months[getMonth(value)]}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={handleYearChange}
              value={getYear(value).toString()}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={{ before: minDate }}
            autoFocus
            month={value}
            onMonthChange={onChange}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        aria-label="Time"
      />
    </div>
  );
}
