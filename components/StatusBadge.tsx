import { Ship } from "@/data/ships";

type Props = {
  status: Ship["status"];
  size?: "sm" | "md";
};

const statusConfig: Record<
  Ship["status"],
  { label: string; className: string; dot: string }
> = {
  接岸中: {
    label: "接岸中",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  出港準備中: {
    label: "出港準備中",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  停泊中: {
    label: "停泊中",
    className: "bg-sky-50 text-sky-700 border border-sky-200",
    dot: "bg-sky-500",
  },
};

export default function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${textSize} ${padding} ${config.className}`}
    >
      <span className={`rounded-full animate-pulse ${dotSize} ${config.dot}`} />
      {config.label}
    </span>
  );
}
