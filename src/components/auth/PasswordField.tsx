"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

interface PasswordFieldProps {
  label: string;
  name: string;
  autoComplete: string;
  hideLabel?: boolean;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function PasswordField({ label, name, autoComplete, hideLabel = false, error, value, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-[15px] font-semibold text-slate-800"}>{label}</label>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`h-13 w-full rounded-xl border bg-white px-4 pr-12 text-base text-slate-950 outline-none transition ${error ? "border-red-500 focus:ring-red-600/10" : "border-slate-300 focus:border-blue-500 focus:ring-blue-600/10"} focus:ring-4`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {error ? <p id={errorId} role="alert" className="mt-2 text-[14px] font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
