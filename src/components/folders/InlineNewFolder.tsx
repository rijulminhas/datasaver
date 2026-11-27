"use client";

import { useState, type FormEvent } from "react";

import { FolderPlusIcon, SpinnerIcon } from "@/components/ui/icons";
import type { FolderSummary } from "@/lib/folders/tree";

/**
 * Compact "New folder" control for pickers (Move / Upload dialogs): creates a
 * top-level folder and hands it back so the picker can select it immediately.
 */
export default function InlineNewFolder({ onCreated }: { onCreated: (folder: FolderSummary) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // never submit an enclosing form
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a folder name.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, parentFolderId: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't create the folder.");
      onCreated({ id: data.folder.id, name: data.folder.name, parentFolderId: null });
      setName("");
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
      >
        <FolderPlusIcon width={16} height={16} />
        New folder
      </button>
    );
  }

  return (
    <form onSubmit={create} className="space-y-1.5" noValidate>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoFocus
          autoComplete="off"
          placeholder="New folder name"
          aria-label="New folder name"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy && <SpinnerIcon width={14} height={14} />}
          Create
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs font-medium text-red-600" role="alert">{error}</p>}
    </form>
  );
}
