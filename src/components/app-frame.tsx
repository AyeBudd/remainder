import { useEffect, useState } from "react";
import { BtcTrackerPage } from "@/components/btc-tracker-page";
import { Dashboard } from "@/components/dashboard";
import { SiteHeader } from "@/components/site-header";
import { WhatIfPage } from "@/components/what-if-page";
import { readAppView, writeAppView, type AppView } from "@/lib/view";

export function AppFrame() {
  const [view, setView] = useState<AppView>(() => readAppView());

  const choose = (next: AppView) => {
    setView(next);
    writeAppView(next);
  };

  useEffect(() => {
    const onHash = () => setView(readAppView());
    window.addEventListener("hashchange", onHash);
    writeAppView(view);
    return () => window.removeEventListener("hashchange", onHash);
    // Sync the first hash only — later changes go through choose().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader view={view} onViewChange={choose} />
      {view === "what-if" ? (
        <WhatIfPage onBack={() => choose("ledger")} />
      ) : view === "btc" ? (
        <BtcTrackerPage />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
