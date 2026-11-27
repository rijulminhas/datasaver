"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CATEGORY_ICONS } from "@/components/files/categoryIcons";
import Modal from "@/components/ui/Modal";
import { CheckIcon, FilesIcon, SpinnerIcon } from "@/components/ui/icons";
import { LoadingIndicator } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_META, FILE_CATEGORIES, type FileCategory } from "@/lib/files/categories";
import { buildFolderOptions, fetchAllFolders } from "@/lib/folders/tree";
import { formatBytes } from "@/lib/format";

/** Matches the file list API's maximum page and the move API's batch limit. */
const MAX_FILES = 500;

type PickerFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  folderId: string | null;
  createdAt: string;
};

type Tab = "all" | FileCategory;

interface Props {
  folderId: string;
  folderName: string;
}

/** "Add existing files" button + picker for moving saved files into a folder. */
export default function AddExistingFilesButton({ folderId, folderName }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <FilesIcon width={18} height={18} />
        Add existing files
      </button>
      {open && <AddExistingFilesDialog folderId={folderId} folderName={folderName} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddExistingFilesDialog({ folderId, folderName, onClose }: Props & { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [files, setFiles] = useState<PickerFile[] | null>(null);
  const [locations, setLocations] = useState<Map<string, string>>(new Map());
  const [truncated, setTruncated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Load the user's library and folder names once when the dialog opens.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/files?limit=${MAX_FILES}`).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't load your files.");
        return data.files as PickerFile[];
      }),
      fetchAllFolders(),
    ])
      .then(([allFiles, folders]) => {
        if (cancelled) return;
        setTruncated(allFiles.length >= MAX_FILES);
        // Files already in this folder can't be added again.
        setFiles(allFiles.filter((f) => f.folderId !== folderId));
        setLocations(new Map(buildFolderOptions(folders).map((o) => [o.id, o.path])));
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message || "Couldn't load your files."));
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  const counts = useMemo(() => {
    const c = new Map<Tab, number>([["all", files?.length ?? 0]]);
    for (const f of files ?? []) c.set(f.category, (c.get(f.category) ?? 0) + 1);
    return c;
  }, [files]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (files ?? []).filter((f) => (tab === "all" || f.category === tab) && (!q || f.name.toLowerCase().includes(q)));
  }, [files, tab, query]);

  const allVisibleSelected = visible.length > 0 && visible.every((f) => selected.has(f.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const f of visible) {
        if (allVisibleSelected) next.delete(f.id);
        else next.add(f.id);
      }
      return next;
    });
  }

  async function addToFolder() {
    if (selected.size === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/files/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: [...selected], folderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't add the files. Please try again.");
      const moved: number = data.moved ?? selected.size;
      onClose();
      router.refresh();
      toast({ message: `Added ${moved} ${moved === 1 ? "file" : "files"} to "${folderName}"` });
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }

  const tabs: Tab[] = ["all", ...FILE_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0)];

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      size="lg"
      title={`Add files to “${folderName}”`}
      description="Choose saved files to move into this folder. They'll be removed from their current folder."
      footer={
        <>
          <p className="mr-auto text-sm text-slate-500">
            {selected.size > 0 ? `${selected.size} selected` : "No files selected"}
          </p>
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
            onClick={addToFolder}
            disabled={busy || selected.size === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <SpinnerIcon width={14} height={14} />}
            Add to folder
          </button>
        </>
      }
    >
      {loadError ? (
        <p className="text-sm font-medium text-red-600" role="alert">{loadError}</p>
      ) : !files ? (
        <LoadingIndicator label="Finding your files…" className="justify-center py-12" />
      ) : files.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-slate-900">No other files to add</p>
          <p className="mt-1 text-sm text-slate-500">All your saved files are already in this folder, or you haven&apos;t uploaded any yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name"
            aria-label="Search files"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="File type">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "all" ? "All" : CATEGORY_META[t].label} <span className="opacity-70">{counts.get(t) ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={visible.length === 0}
              className="rounded-md px-1 py-0.5 font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              {allVisibleSelected ? "Clear selection" : `Select all ${visible.length}`}
            </button>
            {truncated && <span>Showing your newest {MAX_FILES} files</span>}
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No files match your search.</p>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200" aria-label="Files">
              {visible.map((file) => {
                const checked = selected.has(file.id);
                const Icon = CATEGORY_ICONS[file.category];
                const meta = CATEGORY_META[file.category];
                const location = file.folderId ? locations.get(file.folderId) ?? "Another folder" : "Top level";
                return (
                  <li key={file.id}>
                    <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${checked ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(file.id)} className="peer sr-only" />
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 ${
                          checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked && <CheckIcon width={13} height={13} strokeWidth={3} />}
                      </span>
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                      >
                        {file.category === "photos" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- private signed URL via redirect, not optimisable
                          <img src={`/api/files/${file.id}/preview`} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Icon width={17} height={17} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900" title={file.name}>{file.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {formatBytes(file.size)} · {location}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p>}
    </Modal>
  );
}
