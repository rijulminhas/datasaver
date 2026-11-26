
import { z } from "zod";

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .max(255, "Email is too long"),

    password: z
      .string()
      .min(12, "Password must contain at least 12 characters")
      .max(128, "Password cannot exceed 128 characters"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export type SignupInput = z.infer<typeof signupSchema>;


export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Invalid credentials"),
});

export type LoginInput = z.infer<typeof loginSchema>;

