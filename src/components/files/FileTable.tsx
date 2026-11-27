import { CATEGORY_ICONS } from "@/components/files/categoryIcons";
import { LibraryFileActions, TrashFileActions } from "@/components/files/FileActions";
import { FilePreviewProvider, FileThumb, PreviewTrigger } from "@/components/files/FilePreview";
import { CATEGORY_META } from "@/lib/files/categories";
import type { FileDto } from "@/lib/files/service";
import { formatBytes, formatDate } from "@/lib/format";

interface FileTableProps {
  files: FileDto[];
  mode: "library" | "trash";
}

function daysLeft(days: number | null) {
  if (days === null) return "";
  return days <= 1 ? "1 day" : `${days} days`;
}

export default function FileTable({ files, mode }: FileTableProps) {
  const table = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 sm:px-5">Name</th>
            <th scope="col" className="hidden w-28 px-4 py-3 md:table-cell">Type</th>
            <th scope="col" className="hidden w-24 px-4 py-3 text-right sm:table-cell">Size</th>
            <th scope="col" className="hidden w-36 px-4 py-3 text-right lg:table-cell">
              {mode === "trash" ? "Deleted forever in" : "Uploaded"}
            </th>
            <th scope="col" className={`${mode === "trash" ? "w-24 sm:w-72" : "w-40"} px-4 py-3 text-right sm:pr-5`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {files.map((file) => {
            const Icon = CATEGORY_ICONS[file.category];
            const meta = CATEGORY_META[file.category];
            return (
              <tr key={file.id} className="hover:bg-slate-50/70" data-file-id={file.id}>
                <td className="px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    {mode === "library" ? (
                      <FileThumb file={file} />
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                      >
                        <Icon width={17} height={17} />
                      </span>
                    )}
                    <div className="min-w-0">
                      {mode === "library" ? (
                        <PreviewTrigger file={file} />
                      ) : (
                        <p className="truncate font-medium text-slate-900" title={file.name}>{file.name}</p>
                      )}
                      <p className="truncate text-xs text-slate-500 sm:hidden">
                        {formatBytes(file.size)}
                        {mode === "trash" ? ` · deleted forever in ${daysLeft(file.daysUntilPurge)}` : ` · ${formatDate(new Date(file.createdAt))}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{meta.label}</td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-right text-slate-500 tabular-nums sm:table-cell">
                  {formatBytes(file.size)}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-right text-slate-500 lg:table-cell">
                  {mode === "trash" ? daysLeft(file.daysUntilPurge) : formatDate(new Date(file.createdAt))}
                </td>
                <td className="px-4 py-2 sm:pr-5">
                  {mode === "trash" ? (
                    <TrashFileActions fileId={file.id} fileName={file.name} />
                  ) : (
                    <LibraryFileActions fileId={file.id} fileName={file.name} folderId={file.folderId} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Library rows open the in-app viewer; Trash files must be restored first.
  return mode === "library" ? <FilePreviewProvider files={files}>{table}</FilePreviewProvider> : table;
}
