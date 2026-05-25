import type { ReactNode } from "react";

type Tone = "neutral" | "demo" | "info" | "warn" | "danger" | "success";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const toneStyles: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  demo: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Badge({
  tone = "neutral",
  children,
  icon,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
