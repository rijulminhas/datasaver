import Link from "next/link";
import type { FilesIcon } from "@/components/ui/icons";

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  icon: typeof FilesIcon;
  /** Category color for the icon chip; identity only, text stays in text colors. */
  accent?: string;
  href?: string;
}

export default function StatCard({ label, value, detail, icon: Icon, accent, href }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={
            accent
              ? { backgroundColor: `${accent}1a`, color: accent }
              : { backgroundColor: "#eef2ff", color: "#4f46e5" }
          }
        >
          <Icon width={18} height={18} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </>
  );

  const className =
    "block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition";

  return href ? (
    <Link href={href} className={`${className} hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
