"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import MoveFileDialog from "@/components/folders/MoveFileDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  CheckIcon,
  ChevronDownIcon,
  FolderInputIcon,
  RotateCcwIcon,
  SpinnerIcon,
  TrashIcon,
  TrashXIcon,
  XIcon,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

/**
 * Bulk actions for a file list. The user first picks an action from the
 * "Bulk actions" menu; checkboxes then appear on every file and a bar at the
 * bottom shows how many are selected and runs the action on them.
 */

export type BulkAction = "trash" | "delete" | "move" | "restore";
type ListMode = "library" | "trash";

const ACTIONS: Record<BulkAction, { label: string; verb: string; icon: typeof TrashIcon; danger?: boolean }> = {
  move: { label: "Move to folder", verb: "Move", icon: FolderInputIcon },
  trash: { label: "Move to Trash", verb: "Move to Trash", icon: TrashIcon },
  restore: { label: "Restore", verb: "Restore", icon: RotateCcwIcon },
  delete: { label: "Delete permanently", verb: "Delete forever", icon: TrashXIcon, danger: true },
};

const MODE_ACTIONS: Record<ListMode, BulkAction[]> = {
  library: ["move", "trash", "delete"],
  trash: ["restore", "delete"],
};

type BulkContextValue = {
  mode: ListMode;
  action: BulkAction | null;
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  start: (action: BulkAction) => void;
  cancel: () => void;
};

const BulkContext = createContext<BulkContextValue | null>(null);

/** Selection state for one list. Returns null outside a BulkProvider. */
export function useBulk() {
  return useContext(BulkContext);
}

const plural = (n: number) => `${n} ${n === 1 ? "file" : "files"}`;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

interface BulkProviderProps {
  /** Every file id in the list (order = display order), for "Select all". */
  fileIds: string[];
  mode: ListMode;
  /** Folder the list belongs to (folder pages), so Move can mark it "Current". */
  currentFolderId?: string | null;
  children: ReactNode;
}

export function BulkProvider({ fileIds, mode, currentFolderId, children }: BulkProviderProps) {
  const router = useRouter();
  const toast = useToast();
  const [action, setAction] = useState<BulkAction | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Only ids still in the list count (files can disappear after a refresh).
  const selected = useMemo(() => {
    const present = new Set(fileIds);
    return new Set([...picked].filter((id) => present.has(id)));
  }, [picked, fileIds]);

  const allSelected = fileIds.length > 0 && selected.size === fileIds.length;

  function cancel() {
    setAction(null);
    setPicked(new Set());
  }

  // Escape leaves selection mode (when no dialog is open).
  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmOpen && !moveOpen && !busy) cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [action, confirmOpen, moveOpen, busy]);

  const value: BulkContextValue = {
    mode,
    action,
    selected,
    isSelected: (id) => selected.has(id),
    toggle: (id) =>
      setPicked((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    start: (next) => {
      setAction(next);
      setPicked(new Set());
    },
    cancel,
  };

  /** Runs trash/restore/delete. Returns an error message for ConfirmDialog, or nothing. */
  async function run(kind: "trash" | "restore" | "delete"): Promise<string | void> {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    let count: number;
    try {
      count = (await postJson("/api/files/bulk", { action: kind, fileIds: ids })).count ?? ids.length;
    } catch (error) {
      setBusy(false);
      return (error as Error).message;
    }
    setBusy(false);
    cancel();
    router.refresh();

    if (kind === "trash") {
      toast({
        message: `${plural(count)} moved to Trash`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await postJson("/api/files/bulk", { action: "restore", fileIds: ids });
              router.refresh();
              toast({ message: `${plural(count)} restored` });
            } catch (error) {
              toast({ variant: "error", message: (error as Error).message });
            }
          },
        },
      });
    } else {
      toast({ message: kind === "restore" ? `${plural(count)} restored` : `${plural(count)} permanently deleted` });
    }
  }

  async function onPrimary() {
    if (!action || selected.size === 0) return;
    if (action === "move") setMoveOpen(true);
    else if (action === "restore") {
      const error = await run("restore");
      if (error) toast({ variant: "error", message: error });
    } else setConfirmOpen(true);
  }

  const meta = action ? ACTIONS[action] : null;
  const PrimaryIcon = meta?.icon;

  return (
    <BulkContext.Provider value={value}>
      {children}
      {/* Room so the floating bar never covers the last files. */}
      {action && <div aria-hidden="true" className="h-24" />}

      {action && meta && PrimaryIcon && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:left-64">
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl shadow-slate-900/10 sm:flex-nowrap sm:px-4"
          >
            <p className="mr-auto text-sm text-slate-600" aria-live="polite">
              <span className="font-semibold text-slate-900">{selected.size}</span> of {fileIds.length} selected
              <span className="hidden text-slate-400 sm:inline"> · {meta.label}</span>
            </p>
            <button
              type="button"
              onClick={() => setPicked(allSelected ? new Set() : new Set(fileIds))}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPrimary}
              disabled={busy || selected.size === 0}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                meta.danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {busy ? <SpinnerIcon width={15} height={15} /> : <PrimaryIcon width={15} height={15} />}
              {meta.verb}
              {selected.size > 0 && ` (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={action === "delete" ? `Delete ${plural(selected.size)} permanently?` : `Move ${plural(selected.size)} to Trash?`}
        message={
          action === "delete"
            ? "These files will be deleted forever and can't be recovered."
            : "You can restore them from Trash for 30 days, after which they're deleted permanently."
        }
        confirmLabel={action === "delete" ? "Delete forever" : "Move to Trash"}
        destructive={action === "delete"}
        onConfirm={() => run(action === "delete" ? "delete" : "trash")}
      />

      <MoveFileDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        fileIds={[...selected]}
        label={plural(selected.size)}
        currentFolderId={currentFolderId}
        onMoved={cancel}
      />
    </BulkContext.Provider>
  );
}

/** "Bulk actions" dropdown. Picking an action turns on selection mode. */
export function BulkActionsMenu() {
  const bulk = useBulk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!bulk) return null;

  if (bulk.action) {
    return (
      <button
        type="button"
        onClick={bulk.cancel}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <XIcon width={15} height={15} />
        Exit selection
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <CheckIcon width={15} height={15} />
        Bulk actions
        <ChevronDownIcon width={15} height={15} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {MODE_ACTIONS[bulk.mode].map((key) => {
            const { label, icon: Icon, danger } = ACTIONS[key];
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  bulk.start(key);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon width={16} height={16} />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Checkbox for one file; renders nothing until a bulk action is chosen. */
export function BulkCheckbox({ fileId, fileName, className = "" }: { fileId: string; fileName: string; className?: string }) {
  const bulk = useBulk();
  if (!bulk?.action) return null;
  const checked = bulk.isSelected(fileId);
  return (
    <label className={`relative inline-flex shrink-0 cursor-pointer items-center justify-center ${className}`}>
      <input
        type="checkbox"
        data-bulk-checkbox
        checked={checked}
        onChange={() => bulk.toggle(fileId)}
        aria-label={`Select ${fileName}`}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 ${
          checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:border-indigo-400"
        }`}
      >
        {checked && <CheckIcon width={12} height={12} strokeWidth={3.5} />}
      </span>
    </label>
  );
}
