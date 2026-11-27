"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Modal from "@/components/ui/Modal";
import { CheckIcon, FolderIcon, HardDriveIcon, SpinnerIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import InlineNewFolder from "@/components/folders/InlineNewFolder";
import { buildFolderOptions, fetchAllFolders, type FolderSummary } from "@/lib/folders/tree";

type Option = { id: string | null; label: string; depth: number };

interface MoveFileDialogProps {
  open: boolean;
  onClose: () => void;
  fileIds: string[];
  /** Label for the toast, e.g. the file name or "3 files". */
  label: string;
  /**
   * The files' current folder (null = top level), shown as "Current" and not
   * selectable. Omit when the files come from different folders.
   */
  currentFolderId?: string | null;
  /** Called after a successful move (e.g. to clear a bulk selection). */
  onMoved?: () => void;
}

/** "Top level" first, then the folder tree. */
function buildOptions(folders: FolderSummary[]): Option[] {
  return [{ id: null, label: "Top level (no folder)", depth: 0 }, ...buildFolderOptions(folders)];
}

/** Mounted only while open, so each opening starts fresh and reloads folders. */
export default function MoveFileDialog(props: MoveFileDialogProps) {
  return props.open ? <MoveFileForm {...props} /> : null;
}

function MoveFileForm({ onClose, fileIds, label, currentFolderId, onMoved }: MoveFileDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [folders, setFolders] = useState<FolderSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAllFolders()
      .then((list) => !cancelled && setFolders(list))
      .catch((e: Error) => !cancelled && setLoadError(e.message || "Couldn't load your folders."));
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => (folders ? buildOptions(folders) : []), [folders]);
  const nameOf = (id: string | null) => (id === null ? "Top level" : options.find((o) => o.id === id)?.label ?? "folder");

  async function move() {
    if (selected === undefined) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/files/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds, folderId: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't move the file. Please try again.");
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
      return;
    }
    setBusy(false);
    onClose();
    onMoved?.();
    router.refresh();
    toast({ message: `Moved ${label} to ${selected === null ? "the top level" : `"${nameOf(selected)}"`}` });
  }

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title="Move to folder"
      description={`Choose where to move ${label}.`}
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
            onClick={move}
            disabled={busy || selected === undefined || selected === currentFolderId}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <SpinnerIcon width={14} height={14} />}
            Move here
          </button>
        </>
      }
    >
      {loadError ? (
        <p className="text-sm font-medium text-red-600" role="alert">{loadError}</p>
      ) : !folders ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <SpinnerIcon width={16} height={16} /> Loading folders…
        </div>
      ) : (
        <>
          <ul className="max-h-72 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 p-1.5" role="listbox" aria-label="Destination folder">
            {options.map((option) => {
              const isCurrent = option.id === currentFolderId;
              const isSelected = option.id === selected;
              return (
                <li key={option.id ?? "root"} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setSelected(option.id)}
                    style={{ paddingLeft: `${0.75 + option.depth * 1.25}rem` }}
                    className={`flex w-full items-center gap-2.5 rounded-lg py-2 pr-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option.id === null ? (
                      <HardDriveIcon width={16} height={16} className="shrink-0 text-slate-400" />
                    ) : (
                      <FolderIcon width={16} height={16} className="shrink-0 text-amber-500" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isCurrent && <span className="shrink-0 text-xs text-slate-400">Current</span>}
                    {isSelected && <CheckIcon width={16} height={16} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-col gap-1.5">
            {folders.length === 0 && <p className="text-xs text-slate-500">You don&apos;t have any folders yet — create one here.</p>}
            <InlineNewFolder
              onCreated={(folder) => {
                setFolders((list) => [...(list ?? []), folder]);
                setSelected(folder.id);
              }}
            />
          </div>
        </>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p>}
    </Modal>
  );
}
