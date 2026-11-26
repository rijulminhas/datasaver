"use client";

import { FormEvent, useState } from "react";

import Alert from "@/components/ui/Alert";
import { PasswordField, TextField } from "@/components/ui/FormFields";
import SubmitButton from "@/components/ui/SubmitButton";
import { z } from "zod";
import { loginSchema } from "@/lib/validations/auth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const validation = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!validation.success) {
      const errors = z.flattenError(validation.error).fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      // Hard-navigate so all client state is fully reset.
      window.location.href = "/dashboard";
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert>{error}</Alert>}

      <TextField
        name="email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        maxLength={255}
        required
        disabled={loading}
        error={fieldErrors.email}
        onChange={() => clearFieldError("email")}
      />

      <PasswordField
        name="password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        maxLength={128}
        required
        disabled={loading}
        error={fieldErrors.password}
        onChange={() => clearFieldError("password")}
      />

      <SubmitButton loading={loading} loadingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
