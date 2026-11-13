import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-primary-foreground shadow-card">
        <Wrench className="h-4.5 w-4.5" strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-sidebar" />
      </div>
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          tone === "dark" ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        Fix<span className="text-primary">Cell</span>
      </span>
    </div>
  );
}
