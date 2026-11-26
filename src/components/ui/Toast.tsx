"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircleIcon, AlertCircleIcon, XIcon } from "@/components/ui/icons";

type Toast = {
  id: number;
  message: string;
  variant: "success" | "error";
  action?: { label: string; onClick: () => void };
};

type ToastInput = Omit<Toast, "id" | "variant"> & { variant?: Toast["variant"] };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { id, variant: "success", ...input }]);
      setTimeout(() => dismiss(id), input.action ? 8000 : 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((toast) => {
          const Icon = toast.variant === "error" ? AlertCircleIcon : CheckCircleIcon;
          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
            >
              <Icon width={18} height={18} className={toast.variant === "error" ? "shrink-0 text-red-400" : "shrink-0 text-emerald-400"} />
              <span className="min-w-0 flex-1 break-words">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick();
                    dismiss(toast.id);
                  }}
                  className="shrink-0 rounded-md px-2 py-1 font-semibold text-indigo-300 hover:bg-white/10"
                >
                  {toast.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                <XIcon width={14} height={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
