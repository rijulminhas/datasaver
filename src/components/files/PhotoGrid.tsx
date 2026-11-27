"use client";

import { useState } from "react";

import { LibraryFileActions } from "@/components/files/FileActions";
import { FilePreviewProvider, usePreview } from "@/components/files/FilePreview";
import { ImageIcon } from "@/components/ui/icons";
import { getPreviewKind } from "@/lib/files/preview";
import type { FileDto } from "@/lib/files/service";
import { formatBytes } from "@/lib/format";

/** Gallery view for the Photos page. Click a photo to open the viewer. */
export default function PhotoGrid({ files }: { files: FileDto[] }) {
  return (
    <FilePreviewProvider files={files}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5" aria-label="Photos">
        {files.map((file) => (
          <PhotoTile key={file.id} file={file} />
        ))}
      </ul>
    </FilePreviewProvider>
  );
}

function PhotoTile({ file }: { file: FileDto }) {
  const open = usePreview();
  const [failed, setFailed] = useState(false);
  const renderable = getPreviewKind(file.mimeType) === "image" && !failed;

  return (
    <li className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md" data-file-id={file.id}>
      <button
        type="button"
        onClick={() => open(file.id)}
        aria-label={`Open ${file.name}`}
        className="relative block aspect-square w-full overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-indigo-300"
      >
        {renderable ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed, per-user URL
          <img
            src={`/api/files/${file.id}/preview`}
            alt={file.name}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <ImageIcon width={32} height={32} />
            <span className="text-xs">No preview</span>
          </span>
        )}
      </button>
      <div className="flex items-center gap-1 py-1.5 pl-3 pr-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900" title={file.name}>{file.name}</p>
          <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
        </div>
        <LibraryFileActions fileId={file.id} fileName={file.name} folderId={file.folderId} />
      </div>
    </li>
  );
}
