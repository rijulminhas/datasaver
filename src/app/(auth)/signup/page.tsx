import type { Metadata } from "next";
import { Suspense } from "react";

import AuthCard from "@/components/auth/AuthCard";
import RedirectIfAuthenticated from "@/components/auth/RedirectIfAuthenticated";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>

      <AuthCard
        title="Create your account"
        description="Start saving your photos, videos and documents securely."
        footerText="Already have an account?"
        footerLink="/login"
        footerLinkText="Sign in"
      >
        <SignupForm />
      </AuthCard>
    </>
  );
}
