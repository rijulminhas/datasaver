"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import MoveFileDialog from "@/components/folders/MoveFileDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DownloadIcon, FolderInputIcon, RotateCcwIcon, SpinnerIcon, TrashIcon, TrashXIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

const iconButtonBase =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-50";
const iconButton = `${iconButtonBase} text-slate-500 hover:bg-slate-100 hover:text-slate-900`;
const dangerIconButton = `${iconButtonBase} text-red-500 hover:bg-red-50 hover:text-red-700`;

async function request(url: string, method: string) {
  const res = await fetch(url, { method });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

interface Props {
  fileId: string;
  fileName: string;
}

/** Row actions for a file in the library. */
export function LibraryFileActions({ fileId, fileName, folderId }: Props & { folderId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [moveOpen, setMoveOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /** Returns an error message to keep the dialog open, like ConfirmDialog expects. */
  async function moveToTrash() {
    try {
      await request(`/api/files/${fileId}`, "DELETE");
    } catch (error) {
      return (error as Error).message;
    }
    router.refresh();
    toast({
      message: `"${fileName}" moved to Trash`,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            await request(`/api/files/${fileId}/restore`, "POST");
            router.refresh();
            toast({ message: `"${fileName}" restored` });
          } catch (error) {
            toast({ variant: "error", message: (error as Error).message });
          }
        },
      },
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <a href={`/api/files/${fileId}/download`} className={iconButton} aria-label={`Download ${fileName}`} title="Download">
        <DownloadIcon width={16} height={16} />
      </a>
      <button type="button" onClick={() => setMoveOpen(true)} className={iconButton} aria-label={`Move ${fileName} to a folder`} title="Move to folder">
        <FolderInputIcon width={16} height={16} />
      </button>
      <button type="button" onClick={() => setTrashOpen(true)} className={iconButton} aria-label={`Move ${fileName} to Trash`} title="Move to Trash">
        <TrashIcon width={16} height={16} />
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={dangerIconButton}
        aria-label={`Delete ${fileName} permanently`}
        title="Delete permanently"
      >
        <TrashXIcon width={16} height={16} />
      </button>

      <MoveFileDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        fileIds={[fileId]}
        label={`"${fileName}"`}
        currentFolderId={folderId}
      />

      <ConfirmDialog
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        title="Move to Trash?"
        message={
          <>
            <span className="font-medium text-slate-900">&ldquo;{fileName}&rdquo;</span> will be moved to Trash. You can
            restore it from Trash for 30 days, after which it is deleted permanently.
          </>
        }
        confirmLabel="Move to Trash"
        onConfirm={moveToTrash}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete permanently?"
        message={
          <>
            <span className="font-medium text-slate-900">&ldquo;{fileName}&rdquo;</span> will be deleted forever and can&apos;t be recovered.
            To keep it recoverable for 30 days, move it to Trash instead.
          </>
        }
        confirmLabel="Delete forever"
        destructive
        onConfirm={async () => {
          try {
            await request(`/api/files/${fileId}?permanent=true`, "DELETE");
            router.refresh();
            toast({ message: `"${fileName}" permanently deleted` });
          } catch (error) {
            return (error as Error).message;
          }
        }}
      />
    </div>
  );
}

/** Row actions for a file in Trash. */
export function TrashFileActions({ fileId, fileName }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function restore() {
    setBusy(true);
    try {
      await request(`/api/files/${fileId}/restore`, "POST");
      router.refresh();
      toast({ message: `"${fileName}" restored` });
    } catch (error) {
      toast({ variant: "error", message: (error as Error).message });
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={restore}
        disabled={busy}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
      >
        {busy ? <SpinnerIcon width={15} height={15} /> : <RotateCcwIcon width={15} height={15} />}
        <span className="hidden sm:inline">Restore</span>
        <span className="sr-only sm:hidden">Restore {fileName}</span>
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <TrashXIcon width={15} height={15} />
        <span className="hidden sm:inline">Delete forever</span>
        <span className="sr-only sm:hidden">Delete {fileName} forever</span>
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete permanently?"
        message={<><span className="font-medium text-slate-900">&ldquo;{fileName}&rdquo;</span> will be deleted forever and can&apos;t be recovered.</>}
        confirmLabel="Delete forever"
        destructive
        onConfirm={async () => {
          try {
            await request(`/api/files/${fileId}?permanent=true`, "DELETE");
            router.refresh();
            toast({ message: `"${fileName}" permanently deleted` });
          } catch (error) {
            return (error as Error).message;
          }
        }}
      />
    </div>
  );
}

/** "Empty Trash" button with confirmation. */
export function EmptyTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <TrashIcon width={16} height={16} />
        Empty Trash
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Empty Trash?"
        message={`All ${count} ${count === 1 ? "file" : "files"} in Trash will be deleted forever. This can't be undone.`}
        confirmLabel="Empty Trash"
        destructive
        onConfirm={async () => {
          try {
            await request("/api/files/trash", "DELETE");
            router.refresh();
            toast({ message: "Trash emptied" });
          } catch (error) {
            return (error as Error).message;
          }
        }}
      />
    </>
  );
}
