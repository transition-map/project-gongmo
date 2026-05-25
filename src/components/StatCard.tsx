import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "tertiary";

interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  caption?: ReactNode;
  variant?: Variant;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
}

const variantStyles: Record<
  Variant,
  { card: string; label: string; value: string }
> = {
  primary: {
    card: "bg-slate-900 text-white border-slate-900",
    label: "text-slate-300",
    value: "text-white",
  },
  secondary: {
    card: "bg-white border-slate-200",
    label: "text-slate-500",
    value: "text-slate-900",
  },
  tertiary: {
    card: "bg-slate-50 border-slate-200",
    label: "text-slate-500",
    value: "text-slate-800",
  },
};

export default function StatCard({
  label,
  value,
  unit,
  caption,
  variant = "secondary",
  icon,
  trend,
}: StatCardProps) {
  const s = variantStyles[variant];
  const trendColor =
    trend && trend.value < 0
      ? "text-red-300"
      : trend && trend.value > 0
        ? "text-emerald-300"
        : "text-slate-300";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${s.card}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${s.label}`}>{label}</span>
        {icon ? <span className="opacity-80">{icon}</span> : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span
          className={`text-4xl font-bold tracking-tight ${s.value} ${
            variant === "primary" ? "text-5xl" : ""
          }`}
        >
          {value}
        </span>
        {unit ? (
          <span className={`text-sm font-medium ${s.label}`}>{unit}</span>
        ) : null}
      </div>
      {trend ? (
        <div
          className={`mt-1 text-xs font-medium ${
            variant === "primary" ? trendColor : "text-slate-500"
          }`}
        >
          {trend.value > 0 ? "▲" : trend.value < 0 ? "▼" : "■"}{" "}
          {Math.abs(trend.value).toFixed(1)}%
          {trend.label ? ` ${trend.label}` : ""}
        </div>
      ) : null}
      {caption ? (
        <div className={`mt-2 text-xs leading-relaxed ${s.label}`}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}
