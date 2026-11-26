"use client";

import { useState, type ReactNode } from "react";

import Modal from "@/components/ui/Modal";
import { SpinnerIcon } from "@/components/ui/icons";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Return an error message to keep the dialog open and show it. */
  onConfirm: () => Promise<string | void>;
}

export default function ConfirmDialog({ open, onClose, title, message, confirmLabel, destructive, onConfirm }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setBusy(true);
    setError("");
    const result = await onConfirm();
    setBusy(false);
    if (result) setError(result);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {busy && <SpinnerIcon width={14} height={14} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{message}</div>
      {error && <p className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p>}
    </Modal>
  );
}
