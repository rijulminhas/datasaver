"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import PasswordStrength from "@/components/auth/PasswordStrength";
import Alert from "@/components/ui/Alert";
import { PasswordField, TextField } from "@/components/ui/FormFields";
import SubmitButton from "@/components/ui/SubmitButton";
import { z } from "zod";
import { signupSchema } from "@/lib/validations/auth";

type Field = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

export default function SignupForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState("");

  function clearFieldError(field: Field) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const validation = signupSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    if (!validation.success) {
      const errors = z.flattenError(validation.error).fieldErrors;
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);

      // 1. Create the account with the existing signup API.
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const signupResult = await signupResponse.json().catch(() => ({}));

      if (!signupResponse.ok) {
        const serverErrors = signupResult.errors as Record<string, string[] | undefined> | undefined;
        if (serverErrors) {
          setFieldErrors({
            name: serverErrors.name?.[0],
            email: serverErrors.email?.[0],
            password: serverErrors.password?.[0],
            confirmPassword: serverErrors.confirmPassword?.[0],
          });
        }
        setError(signupResult.message || "Unable to create your account.");
        setLoading(false);
        return;
      }

      setSuccess("Account created! Signing you in…");

      // 2. The signup API does not start a session, so sign in with the
      //    existing login API and go straight to the dashboard.
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validation.data.email,
          password: validation.data.password,
        }),
      });

      if (!loginResponse.ok) {
        // Account exists; let the user sign in manually.
        router.replace("/login?registered=1");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setSuccess("");
      setError("Unable to reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <TextField
        name="name"
        label="Full name"
        type="text"
        placeholder="Jane Doe"
        autoComplete="name"
        maxLength={100}
        required
        disabled={loading}
        error={fieldErrors.name}
        onChange={() => clearFieldError("name")}
      />

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
        placeholder="Create a strong password"
        autoComplete="new-password"
        maxLength={128}
        required
        disabled={loading}
        error={fieldErrors.password}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          clearFieldError("password");
        }}
      >
        <PasswordStrength password={password} />
      </PasswordField>

      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        maxLength={128}
        required
        disabled={loading}
        error={fieldErrors.confirmPassword}
        onChange={() => clearFieldError("confirmPassword")}
      />

      <SubmitButton loading={loading} loadingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
