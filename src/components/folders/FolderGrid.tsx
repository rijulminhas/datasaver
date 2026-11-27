import Link from "next/link";

import { FolderActions } from "@/components/folders/FolderActions";
import { FolderIcon } from "@/components/ui/icons";
import type { FolderDto } from "@/lib/folders/service";

function describe(folder: FolderDto) {
  const parts = [];
  if (folder.folderCount > 0) parts.push(`${folder.folderCount} ${folder.folderCount === 1 ? "folder" : "folders"}`);
  parts.push(`${folder.fileCount} ${folder.fileCount === 1 ? "file" : "files"}`);
  return parts.join(" · ");
}

/** Folder cards. The whole card opens the folder; actions sit above the link. */
export default function FolderGrid({ folders }: { folders: FolderDto[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Folders">
      {folders.map((folder) => (
        <li
          key={folder.id}
          className="group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-300"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <FolderIcon width={20} height={20} />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/folders/${folder.id}`}
              className="block truncate text-sm font-semibold text-slate-900 outline-none after:absolute after:inset-0 after:rounded-2xl"
              title={folder.name}
            >
              {folder.name}
            </Link>
            <p className="truncate text-xs text-slate-500">{describe(folder)}</p>
          </div>
          {/* relative + z-10 keeps the buttons clickable above the card-wide link. */}
          <div className="relative z-10 shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <FolderActions
              folderId={folder.id}
              folderName={folder.name}
              fileCount={folder.fileCount}
              folderCount={folder.folderCount}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
