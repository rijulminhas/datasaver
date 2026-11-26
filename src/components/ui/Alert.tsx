import type { ReactNode } from "react";
import { AlertCircleIcon, CheckCircleIcon } from "@/components/ui/icons";

interface AlertProps {
  variant?: "error" | "success";
  children: ReactNode;
}

const styles = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function Alert({ variant = "error", children }: AlertProps) {
  const Icon = variant === "error" ? AlertCircleIcon : CheckCircleIcon;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${styles[variant]}`}
    >
      <Icon width={18} height={18} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}
