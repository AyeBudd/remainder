import { usePresence } from "@/hooks/use-presence";
import { Button } from "@/components/ui/button";

export function IdleResume() {
  const { prompt, stillHere } = usePresence();
  if (!prompt) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-background/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        className="w-full max-w-sm rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
      >
        <h2 id="idle-title" className="font-serif text-3xl tracking-tight">
          Still there?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This tab went quiet, so auto-refresh paused. Click below to start loading prices again.
        </p>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={stillHere}>
            I'm here
          </Button>
        </div>
      </div>
    </div>
  );
}
