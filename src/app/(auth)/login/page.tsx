import type { Metadata } from "next";
import { Suspense } from "react";

import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "@/components/auth/LoginForm";
import RedirectIfAuthenticated from "@/components/auth/RedirectIfAuthenticated";
import RegisteredNotice from "@/components/auth/RegisteredNotice";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>

      <AuthCard
        title="Welcome back"
        description="Sign in to access your files and memories."
        footerText="Don't have an account?"
        footerLink="/signup"
        footerLinkText="Create one for free"
      >
        <Suspense fallback={null}>
          <RegisteredNotice />
        </Suspense>
        <LoginForm />
      </AuthCard>
    </>
  );
}
