import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--cream)] p-6">
      <section className="max-w-lg text-center">
        <FileQuestion className="mx-auto size-10 text-[var(--saffron-dark)]" aria-hidden="true" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[var(--saffron-dark)]">Page not found</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[var(--navy)]">This platform route does not exist</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
          Return to the public overview or open the signed-in dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>Public overview</Link>
          <Link href="/dashboard" className={buttonVariants()}>Dashboard</Link>
        </div>
      </section>
    </main>
  );
}
