"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

const inputBase =
  "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50";
const inputOk = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100";
const inputError = "border-red-400 focus:border-red-500 focus:ring-red-100";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> {
  name: string;
  label: string;
  error?: string;
  labelAction?: ReactNode;
  children?: ReactNode;
}

function FieldShell({
  name,
  label,
  error,
  labelAction,
  children,
}: Pick<FieldProps, "name" | "label" | "error" | "labelAction" | "children">) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={name} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {labelAction}
      </div>
      {children}
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ name, label, error, labelAction, children, ...inputProps }: FieldProps) {
  return (
    <FieldShell name={name} label={label} error={error} labelAction={labelAction}>
      <input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${inputBase} ${error ? inputError : inputOk}`}
        {...inputProps}
      />
      {children}
    </FieldShell>
  );
}

export function PasswordField({ name, label, error, labelAction, children, ...inputProps }: FieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell name={name} label={label} error={error} labelAction={labelAction}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${inputBase} pr-12 ${error ? inputError : inputOk}`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-600 focus-visible:text-indigo-600 focus-visible:outline-none"
        >
          {visible ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
        </button>
      </div>
      {children}
    </FieldShell>
  );
}
