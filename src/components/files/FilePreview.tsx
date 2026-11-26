"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { CATEGORY_ICONS } from "@/components/files/categoryIcons";
import Modal from "@/components/ui/Modal";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SpinnerIcon } from "@/components/ui/icons";
import { CATEGORY_META } from "@/lib/files/categories";
import { getPreviewKind } from "@/lib/files/preview";
import type { FileDto } from "@/lib/files/service";
import { formatBytes, formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Context: one shared preview modal per file list, with prev/next navigation.
// ---------------------------------------------------------------------------

const PreviewContext = createContext<((fileId: string) => void) | null>(null);

export function FilePreviewProvider({ files, children }: { files: FileDto[]; children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const index = useMemo(() => files.findIndex((f) => f.id === openId), [files, openId]);
  const file = index >= 0 ? files[index] : null;

  const go = useCallback(
    (delta: number) => {
      if (index < 0 || files.length < 2) return;
      setOpenId(files[(index + delta + files.length) % files.length].id);
    },
    [files, index]
  );

  // ← / → switch between files while the preview is open.
  useEffect(() => {
    if (!file) return;
    function onKey(e: KeyboardEvent) {
      // Let media players and inputs keep their own arrow-key behaviour.
      if (e.target instanceof Element && e.target.closest("video, audio, input, textarea")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [file, go]);

  return (
    <PreviewContext value={setOpenId}>
      {children}
      <Modal
        open={!!file}
        onClose={() => setOpenId(null)}
        size="xl"
        title={file?.name ?? ""}
        description={
          file && (
            <span className="tabular-nums">
              {CATEGORY_META[file.category].label} · {formatBytes(file.size)} · Uploaded {formatDate(new Date(file.createdAt))}
              {files.length > 1 && ` · ${index + 1} of ${files.length}`}
            </span>
          )
        }
        footer={
          file && (
            <>
              {files.length > 1 && (
                <div className="mr-auto flex gap-2">
                  <button type="button" onClick={() => go(-1)} className={secondaryButton} aria-label="Previous file">
                    <ChevronLeftIcon width={16} height={16} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <button type="button" onClick={() => go(1)} className={secondaryButton} aria-label="Next file">
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRightIcon width={16} height={16} />
                  </button>
                </div>
              )}
              <a href={`/api/files/${file.id}/download`} className={primaryButton}>
                <DownloadIcon width={16} height={16} />
                Download
              </a>
            </>
          )
        }
      >
        {file && <PreviewBody key={file.id} file={file} />}
      </Modal>
    </PreviewContext>
  );
}

export function usePreview() {
  const open = useContext(PreviewContext);
  if (!open) throw new Error("usePreview must be used inside <FilePreviewProvider>");
  return open;
}

const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";

// ---------------------------------------------------------------------------
// Triggers & thumbnails
// ---------------------------------------------------------------------------

/** File name that opens the preview. */
export function PreviewTrigger({ file }: { file: FileDto }) {
  const open = usePreview();
  return (
    <button
      type="button"
      onClick={() => open(file.id)}
      className="block max-w-full truncate text-left font-medium text-slate-900 hover:text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      title={`Open ${file.name}`}
    >
      {file.name}
    </button>
  );
}

/** Small thumbnail for images, category icon for everything else. */
export function FileThumb({ file, size = 36 }: { file: FileDto; size?: number }) {
  const open = usePreview();
  const [failed, setFailed] = useState(false);
  const meta = CATEGORY_META[file.category];
  const Icon = CATEGORY_ICONS[file.category];
  const showImage = getPreviewKind(file.mimeType) === "image" && !failed;

  return (
    <button
      type="button"
      onClick={() => open(file.id)}
      aria-label={`Preview ${file.name}`}
      tabIndex={-1}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
      style={{ width: size, height: size, backgroundColor: `${meta.color}1a`, color: meta.color }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed, per-user URLs can't go through next/image
        <img
          src={`/api/files/${file.id}/preview`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon width={Math.round(size * 0.47)} height={Math.round(size * 0.47)} />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Viewers
// ---------------------------------------------------------------------------

function PreviewBody({ file }: { file: FileDto }) {
  const kind = getPreviewKind(file.mimeType);
  const [failed, setFailed] = useState(false);
  const src = `/api/files/${file.id}/preview`;

  if (!kind || failed) return <NoPreview file={file} playbackFailed={failed} />;

  switch (kind) {
    case "image":
      return (
        <div className="flex min-h-48 items-center justify-center rounded-xl bg-slate-100 p-2" data-preview="image">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed, per-user URL */}
          <img src={src} alt={file.name} onError={() => setFailed(true)} className="max-h-[68vh] max-w-full rounded-lg object-contain" />
        </div>
      );
    case "video":
      return (
        <div className="overflow-hidden rounded-xl bg-black" data-preview="video">
          <video src={src} controls playsInline preload="metadata" onError={() => setFailed(true)} className="max-h-[68vh] w-full">
            Your browser can&apos;t play this video.
          </video>
        </div>
      );
    case "audio":
      return (
        <div className="flex flex-col items-center gap-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-10" data-preview="audio">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm">
            <BigIcon file={file} />
          </span>
          <p className="max-w-full truncate text-sm font-medium text-slate-700">{file.name}</p>
          <audio src={src} controls preload="metadata" onError={() => setFailed(true)} className="w-full max-w-md" />
        </div>
      );
    case "pdf":
      return (
        <iframe
          src={src}
          title={file.name}
          data-preview="pdf"
          className="h-[68vh] w-full rounded-xl border border-slate-200 bg-slate-50"
        />
      );
    case "text":
      return <TextViewer file={file} />;
  }
}

function TextViewer({ file }: { file: FileDto }) {
  const [state, setState] = useState<{ text: string; truncated: boolean } | { error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/files/${file.id}/text`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setState(res.ok ? { text: data.text, truncated: data.truncated } : { error: data.message || "Couldn't load this file." });
      })
      .catch(() => !cancelled && setState({ error: "Couldn't load this file. Check your connection." }));
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  if (!state) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-400">
        <SpinnerIcon width={24} height={24} />
      </div>
    );
  }
  if ("error" in state) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{state.error}</p>;

  const delimiter = file.mimeType === "text/csv" ? "," : file.mimeType === "text/tab-separated-values" ? "\t" : null;
  const rows = delimiter ? parseDelimited(state.text, delimiter) : null;

  return (
    <div data-preview="text">
      {rows && rows.length > 0 ? (
        <div className="max-h-[64vh] overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 font-semibold text-slate-700">
              <tr>{rows[0].map((cell, i) => <th key={i} className="whitespace-nowrap border-b border-slate-200 px-3 py-2">{cell}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(1).map((row, r) => (
                <tr key={r} className="odd:bg-white even:bg-slate-50/60">
                  {row.map((cell, c) => <td key={c} className="whitespace-nowrap px-3 py-1.5 text-slate-700">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="max-h-[64vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
          {state.text}
        </pre>
      )}
      {(state.truncated || (rows && rows.length >= MAX_ROWS)) && (
        <p className="mt-2 text-xs text-slate-500">Showing the beginning of this file. Download it to see everything.</p>
      )}
    </div>
  );
}

function NoPreview({ file, playbackFailed }: { file: FileDto; playbackFailed: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-slate-50 px-6 py-12 text-center" data-preview="none">
      <span
        className="flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${CATEGORY_META[file.category].color}1a`, color: CATEGORY_META[file.category].color }}
      >
        <BigIcon file={file} />
      </span>
      <p className="mt-4 text-base font-semibold text-slate-900">
        {playbackFailed ? "Your browser can't display this file" : "No preview available"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {playbackFailed
          ? "The format or codec isn't supported here. Download the file to open it on your device."
          : `${file.extension ? `.${file.extension.toUpperCase()} files` : "This file type"} can't be shown in the browser. Download it to open it on your device.`}
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 text-left text-xs">
        <dt className="text-slate-400">Type</dt>
        <dd className="text-slate-700">{file.mimeType}</dd>
        <dt className="text-slate-400">Size</dt>
        <dd className="text-slate-700">{formatBytes(file.size)}</dd>
      </dl>
    </div>
  );
}

function BigIcon({ file }: { file: FileDto }) {
  const Icon = CATEGORY_ICONS[file.category];
  return <Icon width={36} height={36} />;
}

// Minimal CSV/TSV parser (quoted fields, escaped quotes, newlines in quotes).
const MAX_ROWS = 500;
const MAX_COLS = 50;

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length && rows.length < MAX_ROWS; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row.slice(0, MAX_COLS));
      row = [];
      field = "";
    } else field += ch;
  }
  if ((field || row.length) && rows.length < MAX_ROWS) {
    row.push(field);
    rows.push(row.slice(0, MAX_COLS));
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}
