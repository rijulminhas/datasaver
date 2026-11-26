"use client";

import { useState } from "react";
import { LogOutIcon, SpinnerIcon } from "@/components/ui/icons";

interface LogoutButtonProps {
  className?: string;
  onError?: (message: string) => void;
  role?: string;
}

// Calls the existing logout API (deletes the DB session + expires the cookie),
// then sends the user to /login.
export default function LogoutButton({ className = "", onError, role }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.href = "/login";
    } catch {
      setLoading(false);
      onError?.("Unable to sign out. Please try again.");
    }
  }

  return (
    <button
      type="button"
      role={role}
      onClick={handleLogout}
      disabled={loading}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 ${className}`}
    >
      {loading ? <SpinnerIcon width={16} height={16} /> : <LogOutIcon width={16} height={16} />}
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
