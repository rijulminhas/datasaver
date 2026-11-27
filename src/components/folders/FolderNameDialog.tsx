"use client";

import { useState, type FormEvent } from "react";

import Modal from "@/components/ui/Modal";
import { SpinnerIcon } from "@/components/ui/icons";

const MAX_LENGTH = 100;

interface FolderNameDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel: string;
  initialName?: string;
  /** Return an error message to keep the dialog open and show it. */
  onSubmit: (name: string) => Promise<string | void>;
}

/**
 * Small form dialog used to create and rename folders. The form is only
 * mounted while open, so it starts fresh every time it opens.
 */
export default function FolderNameDialog(props: FolderNameDialogProps) {
  return props.open ? <FolderNameForm {...props} /> : null;
}

function FolderNameForm({
  open,
  onClose,
  title,
  description,
  submitLabel,
  initialName = "",
  onSubmit,
}: FolderNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Folder name is required.");
    if (/[\\/]/.test(trimmed)) return setError("Folder names can't contain / or \\.");
    if (trimmed === initialName.trim()) return onClose();

    setBusy(true);
    setError("");
    const result = await onSubmit(trimmed);
    setBusy(false);
    if (result) setError(result);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
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
            type="submit"
            form="folder-name-form"
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <SpinnerIcon width={14} height={14} />}
            {submitLabel}
          </button>
        </>
      }
    >
      <form id="folder-name-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="folder-name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Folder name
        </label>
        <input
          id="folder-name"
          name="folder-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_LENGTH}
          autoFocus
          autoComplete="off"
          placeholder="e.g. Holiday 2026"
          aria-invalid={!!error}
          aria-describedby={error ? "folder-name-error" : undefined}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {error && (
          <p id="folder-name-error" className="mt-1.5 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
