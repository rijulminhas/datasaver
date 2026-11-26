import Link from "next/link";
import { CloudIcon } from "@/components/ui/icons";

interface LogoProps {
  href?: string;
  variant?: "dark" | "light";
}

export default function Logo({ href = "/", variant = "dark" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-slate-900";

  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="DataSaver home">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${
          variant === "light"
            ? "bg-white/15 ring-1 ring-white/30"
            : "bg-indigo-600 shadow-sm shadow-indigo-600/30"
        }`}
      >
        <CloudIcon width={20} height={20} />
      </span>
      <span className={`text-xl font-bold tracking-tight ${textColor}`}>
        Data<span className={variant === "light" ? "text-indigo-200" : "text-indigo-600"}>Saver</span>
      </span>
    </Link>
  );
}
