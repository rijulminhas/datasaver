"use client";

import { useLinkStatus } from "next/link";

import { SpinnerIcon } from "@/components/ui/icons";

/**
 * Small spinner over a <Link> while its page loads. Must be rendered inside
 * the Link. Always mounted and toggled by opacity, so it never shifts layout.
 */
export function LinkPendingSpinner() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 transition-opacity ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    >
      <SpinnerIcon width={14} height={14} className="text-indigo-600" />
    </span>
  );
}
