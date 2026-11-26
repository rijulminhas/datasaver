import Link from "next/link";

import EmptyState from "@/components/dashboard/EmptyState";
import FileTable from "@/components/files/FileTable";
import { UploadCloudIcon } from "@/components/ui/icons";
import type { FileDto } from "@/lib/files/service";

export default function RecentFiles({ files }: { files: FileDto[] }) {
  return (
    <section aria-labelledby="recent-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-heading" className="text-base font-semibold text-slate-900">Recently uploaded</h2>
        {files.length > 0 && (
          <Link href="/dashboard/files" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        )}
      </div>

      {files.length === 0 ? (
        <EmptyState
          compact
          icon={UploadCloudIcon}
          title="No files yet"
          description="Use “Upload files” to add photos, videos, documents and more. They’ll show up here."
        />
      ) : (
        <FileTable files={files} mode="library" />
      )}
    </section>
  );
}
