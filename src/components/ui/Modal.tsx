"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "lg" | "xl";
}

/** Accessible modal on the native <dialog> (focus trap + Escape built in). */
export default function Modal({ open, onClose, title, description, children, footer, size = "sm" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      // overflow-hidden: only the body below scrolls, never the dialog itself
      // (which would show a second scrollbar and empty space under the footer).
      className={`m-auto w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm ${
        size === "xl" ? "max-w-5xl" : size === "lg" ? "max-w-xl" : "max-w-md"
      }`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-2 pt-6">
            <div>
              <h2 id="modal-title" className="break-all text-lg font-semibold text-slate-900">{title}</h2>
              {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <XIcon width={18} height={18} />
            </button>
          </div>
          {/* relative: keeps absolutely positioned children (e.g. sr-only inputs) inside the scroll area.
              min-h-0: lets this flex child shrink and scroll instead of overflowing the dialog. */}
          <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
