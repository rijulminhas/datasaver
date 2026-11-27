"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";

import InlineNewFolder from "@/components/folders/InlineNewFolder";
import Modal from "@/components/ui/Modal";
import { AlertCircleIcon, CheckCircleIcon, FolderIcon, SpinnerIcon, UploadCloudIcon, XIcon } from "@/components/ui/icons";
import { buildFolderOptions, fetchAllFolders, type FolderSummary } from "@/lib/folders/tree";
import { formatBytes } from "@/lib/format";

type Status = "queued" | "uploading" | "verifying" | "done" | "error" | "cancelled";

type UploadItem = {
  id: string;
  file: File;
  status: Status;
  progress: number; // 0..1
  error?: string;
  fileId?: string;
  /** Destination chosen when the file was added (null = top level). */
  folderId: string | null;
  /** Destination name for the status line. */
  folderLabel: string | null;
};

const MAX_CONCURRENT = 3;

interface UploadDialogProps {
  maxFileBytes: number;
  /**
   * Upload into this folder (the server checks it belongs to the user). When
   * set, the destination is fixed; otherwise the dialog shows a folder picker.
   */
  folderId?: string | null;
  /** Shown in the dialog so it's clear where files will go. */
  folderName?: string;
}

/**
 * Upload flow per file:
 *   1. POST /api/files/upload        → server checks size/quota, returns signed URL
 *   2. PUT file to storage (XHR)     → real upload progress
 *   3. POST /api/files/[id]/complete → server verifies size + file signature
 */
export default function UploadDialog({ maxFileBytes, folderId = null, folderName }: UploadDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(new Set<string>());
  const xhrs = useRef(new Map<string, XMLHttpRequest>());

  // Destination picker (only when the page didn't fix a folder).
  const fixedFolder = folderId !== null;
  const [destination, setDestination] = useState<string | null>(folderId);
  const [folders, setFolders] = useState<FolderSummary[] | null>(null);
  const [foldersError, setFoldersError] = useState("");
  const folderOptions = folders ? buildFolderOptions(folders) : [];
  const destinationLabel = fixedFolder
    ? folderName ?? "this folder"
    : destination
      ? folderOptions.find((o) => o.id === destination)?.path ?? null
      : null;

  useEffect(() => {
    if (!open || fixedFolder) return;
    let cancelled = false;
    fetchAllFolders()
      .then((list) => {
        if (cancelled) return;
        setFolders(list);
        setFoldersError("");
        // The selected folder may have been deleted meanwhile.
        setDestination((current) => (current && !list.some((f) => f.id === current) ? null : current));
      })
      .catch((e: Error) => !cancelled && setFoldersError(e.message));
    return () => {
      cancelled = true;
    };
  }, [open, fixedFolder]);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((all) => all.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  // Each file keeps the destination selected at the moment it was added.
  function addFiles(list: FileList | File[]) {
    const added: UploadItem[] = Array.from(list).map((file) => {
      const base = { id: crypto.randomUUID(), file, progress: 0, folderId: destination, folderLabel: destinationLabel };
      if (file.size === 0) return { ...base, status: "error", error: "Empty files can't be uploaded." };
      if (file.size > maxFileBytes) {
        return { ...base, status: "error", error: `Too large — the limit is ${formatBytes(maxFileBytes)} per file.` };
      }
      return { ...base, status: "queued" };
    });
    setItems((all) => [...all, ...added]);
  }

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      update(item.id, { status: "uploading", progress: 0 });
      try {
        // 1. Ask the server for a signed upload URL.
        const initRes = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: item.file.name, size: item.file.size, folderId: item.folderId }),
        });
        const init = await initRes.json().catch(() => ({}));
        if (!initRes.ok) throw new Error(init.message || "Couldn't start the upload.");
        update(item.id, { fileId: init.fileId });

        // 2. Upload the bytes straight to storage with progress events.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrs.current.set(item.id, xhr);
          xhr.open(init.upload.method, init.upload.url);
          for (const [key, value] of Object.entries(init.upload.headers as Record<string, string>)) {
            xhr.setRequestHeader(key, value);
          }
          xhr.upload.onprogress = (e) => e.lengthComputable && update(item.id, { progress: e.loaded / e.total });
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Storage rejected the upload. Please try again.")));
          // A network-level failure is either the user being offline or the
          // storage bucket blocking the request (e.g. a missing CORS rule).
          xhr.onerror = () =>
            reject(
              new Error(
                navigator.onLine
                  ? "Couldn't reach file storage. Please try again later."
                  : "You appear to be offline. Check your connection and try again."
              )
            );
          xhr.onabort = () => reject(new DOMException("Cancelled", "AbortError"));
          xhr.send(item.file);
        });
        xhrs.current.delete(item.id);

        // 3. Ask the server to verify and save it.
        update(item.id, { status: "verifying", progress: 1 });
        const doneRes = await fetch(`/api/files/${init.fileId}/complete`, { method: "POST" });
        const done = await doneRes.json().catch(() => ({}));
        if (!doneRes.ok) throw new Error(done.message || "Couldn't save the file.");

        update(item.id, { status: "done" });
        router.refresh();
      } catch (error) {
        xhrs.current.delete(item.id);
        if (error instanceof DOMException && error.name === "AbortError") return;
        update(item.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed." });
      }
    },
    [router, update]
  );

  // Simple scheduler: keep up to MAX_CONCURRENT uploads running.
  useEffect(() => {
    const active = items.filter((i) => i.status === "uploading" || i.status === "verifying").length;
    const next = items.filter((i) => i.status === "queued" && !started.current.has(i.id)).slice(0, MAX_CONCURRENT - active);
    for (const item of next) {
      started.current.add(item.id);
      void uploadOne(item);
    }
  }, [items, uploadOne]);

  function cancel(item: UploadItem) {
    xhrs.current.get(item.id)?.abort();
    xhrs.current.delete(item.id);
    update(item.id, { status: "cancelled" });
    // Release the reserved space right away (it would also expire on its own).
    if (item.fileId) void fetch(`/api/files/${item.fileId}?permanent=true`, { method: "DELETE" });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  const inProgress = items.some((i) => ["queued", "uploading", "verifying"].includes(i.status));
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <UploadCloudIcon width={18} height={18} />
        Upload files
        {inProgress && <SpinnerIcon width={14} height={14} />}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Upload files"
        description={`Photos, videos, documents, audio, archives and more · up to ${formatBytes(maxFileBytes)} per file`}
        footer={
          <>
            {!inProgress && items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setItems([]);
                  started.current.clear();
                }}
                className="mr-auto rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Clear list
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {inProgress ? "Continue in background" : "Done"}
            </button>
          </>
        }
      >
        <div className="mb-4">
          {fixedFolder ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <FolderIcon width={16} height={16} className="shrink-0 text-amber-500" />
              Saving to <span className="truncate font-semibold text-slate-900">{folderName ?? "this folder"}</span>
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor="upload-destination" className="block text-sm font-medium text-slate-700">
                Save to
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  id="upload-destination"
                  value={destination ?? ""}
                  onChange={(e) => setDestination(e.target.value || null)}
                  disabled={!folders && !foldersError}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                >
                  <option value="">Top level (no folder)</option>
                  {folderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.path}
                    </option>
                  ))}
                </select>
                <InlineNewFolder
                  onCreated={(folder) => {
                    setFolders((list) => [...(list ?? []), folder]);
                    setDestination(folder.id);
                  }}
                />
              </div>
              {!folders && !foldersError && <p className="text-xs text-slate-500">Loading folders…</p>}
              {foldersError && <p className="text-xs font-medium text-red-600">{foldersError}</p>}
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
            <UploadCloudIcon width={24} height={24} />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-900">Drag and drop files here</p>
          <p className="mt-1 text-xs text-slate-500">or</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            data-testid="file-input"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-slate-500">
              {doneCount} of {items.length} uploaded
            </p>
            <ul className="space-y-2" aria-label="Upload queue">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 px-3 py-2.5" data-status={item.status}>
                  <div className="flex items-center gap-3">
                    <StatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900" title={item.file.name}>{item.file.name}</p>
                      <p className={`text-xs ${item.status === "error" ? "text-red-600" : "text-slate-500"}`}>
                        {statusText(item)}
                      </p>
                    </div>
                    {(item.status === "queued" || item.status === "uploading") && (
                      <button
                        type="button"
                        onClick={() => cancel(item)}
                        aria-label={`Cancel upload of ${item.file.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <XIcon width={16} height={16} />
                      </button>
                    )}
                  </div>
                  {(item.status === "uploading" || item.status === "verifying") && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${item.file.name}`}>
                      <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-200" style={{ width: `${item.progress * 100}%` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}

function statusText(item: UploadItem) {
  const size = formatBytes(item.file.size);
  switch (item.status) {
    case "queued":
      return `${size} · Waiting…`;
    case "uploading":
      return `${size} · ${Math.round(item.progress * 100)}%`;
    case "verifying":
      return `${size} · Checking file…`;
    case "done":
      return `${size} · Uploaded${item.folderLabel ? ` to ${item.folderLabel}` : ""}`;
    case "cancelled":
      return `${size} · Cancelled`;
    case "error":
      return item.error ?? "Upload failed.";
  }
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <CheckCircleIcon width={20} height={20} className="shrink-0 text-emerald-500" />;
  if (status === "error") return <AlertCircleIcon width={20} height={20} className="shrink-0 text-red-500" />;
  if (status === "uploading" || status === "verifying") return <SpinnerIcon width={20} height={20} className="shrink-0 text-indigo-600" />;
  return <UploadCloudIcon width={20} height={20} className="shrink-0 text-slate-300" />;
}
