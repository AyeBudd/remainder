import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { APP_PAGES } from "@/lib/pages";
import type { AppView } from "@/lib/view";
import { Button } from "@/components/ui/button";

type Props = {
  view: AppView;
  onChange: (view: AppView) => void;
};

export function AppNav({ view, onChange }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = (next: AppView) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open pages"
        aria-expanded={open}
        aria-controls="app-pages"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-background/70"
            aria-label="Close pages"
            onClick={() => setOpen(false)}
          />
          <aside
            id="app-pages"
            role="dialog"
            aria-modal="true"
            aria-label="Pages"
            className="absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col bg-card shadow-[var(--shadow-border)]"
          >
            <div className="flex h-16 items-center justify-between px-3">
              <p className="px-2 font-serif text-xl tracking-tight">Pages</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close pages"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 px-3 pb-6">
              {APP_PAGES.map((page) => {
                const active = page.id === view;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => go(page.id as AppView)}
                    className={
                      active
                        ? "rounded-lg bg-secondary px-3 py-3 text-left"
                        : "rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/70"
                    }
                  >
                    <span className="block font-serif text-xl tracking-tight">{page.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{page.hint}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
