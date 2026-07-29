import { LegalBridgeLogo } from "@/components/brand/legalbridge-logo";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--cream)] p-6" aria-live="polite">
      <div className="text-center">
        <LegalBridgeLogo />
        <div className="mx-auto mt-6 h-2 w-48 overflow-hidden rounded-full bg-white">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--saffron)]" />
        </div>
        <p className="mt-3 text-sm text-[var(--slate)]">Preparing the local demonstration workspace…</p>
      </div>
    </main>
  );
}
