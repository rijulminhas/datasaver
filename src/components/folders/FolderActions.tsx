"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FolderNameDialog from "@/components/folders/FolderNameDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FolderPlusIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

async function request(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";
const dangerIconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";

/** "New folder" button. Creates at the top level or inside parentFolderId. */
export function NewFolderButton({ parentFolderId = null, variant = "secondary" }: { parentFolderId?: string | null; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700"
            : "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        }
      >
        <FolderPlusIcon width={18} height={18} />
        New folder
      </button>
      <FolderNameDialog
        open={open}
        onClose={() => setOpen(false)}
        title={parentFolderId ? "New subfolder" : "New folder"}
        submitLabel="Create folder"
        onSubmit={async (name) => {
          try {
            await request("/api/folders", "POST", { name, parentFolderId });
          } catch (error) {
            return (error as Error).message;
          }
          router.refresh();
          toast({ message: `Folder "${name}" created` });
        }}
      />
    </>
  );
}

interface FolderActionsProps {
  folderId: string;
  folderName: string;
  fileCount: number;
  folderCount: number;
  /** Where to go after deleting (e.g. the parent folder). Omit to stay and refresh. */
  redirectAfterDelete?: string;
  /** Show labelled buttons (folder header) instead of compact icons (cards). */
  labelled?: boolean;
}

/** Rename and delete controls for one folder. */
export function FolderActions({ folderId, folderName, fileCount, folderCount, redirectAfterDelete, labelled }: FolderActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const contents = [
    folderCount > 0 && `${folderCount} ${folderCount === 1 ? "subfolder" : "subfolders"}`,
    fileCount > 0 && `${fileCount} ${fileCount === 1 ? "file" : "files"}`,
  ].filter(Boolean);

  return (
    <>
      {labelled ? (
        <>
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <PencilIcon width={16} height={16} />
            <span className="hidden sm:inline">Rename</span>
            <span className="sr-only sm:hidden">Rename folder</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <TrashIcon width={16} height={16} />
            <span className="hidden sm:inline">Delete</span>
            <span className="sr-only sm:hidden">Delete folder</span>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => setRenameOpen(true)} className={iconButton} aria-label={`Rename ${folderName}`} title="Rename">
            <PencilIcon width={15} height={15} />
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={dangerIconButton} aria-label={`Delete ${folderName}`} title="Delete folder">
            <TrashIcon width={15} height={15} />
          </button>
        </div>
      )}

      <FolderNameDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename folder"
        submitLabel="Save"
        initialName={folderName}
        onSubmit={async (name) => {
          try {
            await request(`/api/folders/${folderId}`, "PATCH", { name });
          } catch (error) {
            return (error as Error).message;
          }
          router.refresh();
          toast({ message: `Folder renamed to "${name}"` });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete folder?"
        message={
          contents.length > 0 ? (
            <>
              <span className="font-medium text-slate-900">&ldquo;{folderName}&rdquo;</span> contains {contents.join(" and ")}. The folder
              {folderCount > 0 && " and its subfolders"} will be deleted, and every file inside will be moved to Trash, where you
              can restore it for 30 days.
            </>
          ) : (
            <>
              The empty folder <span className="font-medium text-slate-900">&ldquo;{folderName}&rdquo;</span> will be deleted.
            </>
          )
        }
        confirmLabel="Delete folder"
        destructive
        onConfirm={async () => {
          let data: { message?: string };
          try {
            data = await request(`/api/folders/${folderId}`, "DELETE");
          } catch (error) {
            return (error as Error).message;
          }
          if (redirectAfterDelete) router.replace(redirectAfterDelete);
          router.refresh();
          toast({ message: data.message ?? "Folder deleted" });
        }}
      />
    </>
  );
}
