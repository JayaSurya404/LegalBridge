"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--cream)] p-6">
      <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-7 shadow-lg">
        <AlertTriangle className="size-8 text-[var(--red)]" aria-hidden="true" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-red-700">Runtime error</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--navy)]">The workspace could not render this view</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
          Your saved backend records and local synthetic analysis state are not changed by this rendering error. Try this view again; if the issue persists, return to the dashboard.
        </p>
        <p className="mt-3 break-words rounded-lg bg-red-50 p-3 text-xs text-red-800">{error.message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" onClick={() => { window.location.href = "/dashboard"; }}>Return to dashboard</Button>
        </div>
      </section>
    </main>
  );
}
