// Client-safe folder helpers (no server imports), shared by folder pickers.

export type FolderSummary = { id: string; name: string; parentFolderId: string | null };
export type FolderOption = { id: string; label: string; path: string; depth: number };

/** Flatten folders into an A–Z tree (parents before children), with full paths. */
export function buildFolderOptions(folders: FolderSummary[]): FolderOption[] {
  const children = new Map<string | null, FolderSummary[]>();
  for (const f of folders) {
    const list = children.get(f.parentFolderId) ?? [];
    list.push(f);
    children.set(f.parentFolderId, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }
  const out: FolderOption[] = [];
  const visit = (parent: string | null, depth: number, prefix: string) => {
    for (const f of children.get(parent) ?? []) {
      const path = prefix ? `${prefix} / ${f.name}` : f.name;
      out.push({ id: f.id, label: f.name, path, depth });
      if (depth < 12) visit(f.id, depth + 1, path);
    }
  };
  visit(null, 0, "");
  return out;
}

/** Load every folder the user owns (for pickers). Throws a readable message on failure. */
export async function fetchAllFolders(): Promise<FolderSummary[]> {
  const res = await fetch("/api/folders?all=true");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Couldn't load your folders.");
  return data.folders;
}
