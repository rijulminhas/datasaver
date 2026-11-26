"use client";

import { useSearchParams } from "next/navigation";
import Alert from "@/components/ui/Alert";

// Shown on /login?registered=1 when signup succeeded but auto sign-in did not.
export default function RegisteredNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("registered") !== "1") return null;

  return (
    <div className="mb-5">
      <Alert variant="success">Your account was created. Please sign in to continue.</Alert>
    </div>
  );
}
