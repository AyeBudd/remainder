import { formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Change24({
  change,
  className,
}: {
  change?: number;
  className?: string;
}) {
  if (change == null || !Number.isFinite(change)) return null;
  const tone = change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <p className={cn("font-mono text-sm tabular-nums", tone, className)} title="Past 24 hours">
      {formatSignedPercent(change)}
      <span className="ml-1 text-muted-foreground">24h</span>
    </p>
  );
}
