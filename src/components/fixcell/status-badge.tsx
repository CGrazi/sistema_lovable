import { cn } from "@/lib/utils";
import { statusInfo, type OsStatus } from "@/lib/os";

export function StatusBadge({ status, className }: { status: OsStatus; className?: string }) {
  const info = statusInfo(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        info.className,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {info.label}
    </span>
  );
}
