"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { publicEnv } from "@/lib/env/public-env";
import { useAppStore } from "@/stores/app-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const settings = useAppStore((state) => state.settings);

  useEffect(() => {
    document.documentElement.dataset.density = settings.density;
    document.documentElement.dataset.reduceMotion = String(settings.reducedMotion);
  }, [settings]);

  if (publicEnv.configurationError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--cream)] p-6">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-7 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700">
            Configuration error
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--navy)]">
            The frontend data mode is not configured
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
            {publicEnv.configurationError} Use{" "}
            <code className="rounded bg-slate-100 px-1.5 py-1">
              NEXT_PUBLIC_DATA_MODE=mock
            </code>{" "}
            or configure HTTP mode with{" "}
            <code className="rounded bg-slate-100 px-1.5 py-1">
              NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
            </code>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ className: "font-sans" }}
      />
    </QueryClientProvider>
  );
}
