"use client";

import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DateTimePickerProps {
  value?: string | null;
  onChange: (isoString: string) => void;
  error?: boolean;
  placeholder?: string;
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  error?: boolean;
  placeholder?: string;
}

const CustomInput = forwardRef<HTMLButtonElement, CustomInputProps>(
  ({ value, onClick, error, placeholder }, ref) => (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className={`w-full px-3 py-2 border rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        error ? "border-red-400 bg-red-50" : "border-gray-300"
      } ${value ? "text-gray-800" : "text-gray-400"}`}
    >
      {value || placeholder}
    </button>
  )
);
CustomInput.displayName = "DateTimePickerInput";

export function DateTimePicker({ value, onChange, error, placeholder = "Select date & time" }: DateTimePickerProps) {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(date: Date | null) => date && onChange(date.toISOString())}
      showTimeSelect
      timeIntervals={15}
      timeFormat="HH:mm"
      dateFormat="dd/MM/yyyy HH:mm"
      calendarStartDay={1}
      wrapperClassName="w-full"
      popperClassName="datetime-picker-popper"
      customInput={<CustomInput error={error} placeholder={placeholder} />}
    />
  );
}
