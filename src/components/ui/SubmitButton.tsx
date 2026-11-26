import type { ReactNode } from "react";
import { SpinnerIcon } from "@/components/ui/icons";

interface SubmitButtonProps {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
  disabled?: boolean;
}

export default function SubmitButton({ loading, loadingText, children, disabled }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <SpinnerIcon width={16} height={16} />}
      {loading ? loadingText : children}
    </button>
  );
}
