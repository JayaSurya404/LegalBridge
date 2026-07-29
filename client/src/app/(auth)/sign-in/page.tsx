import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { LegalBridgeLogo } from "@/components/brand/legalbridge-logo";
import { PrototypeDisclaimer } from "@/components/shared/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata = { title: "Demo sign in" };

export default function SignInPage() {
  return (
    <main id="main-content" className="min-h-screen bg-[var(--cream)] px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
          <ArrowLeft className="size-4" aria-hidden="true" /> Return to public overview
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1fr_.85fr] lg:items-start">
          <section className="pt-2 lg:pt-12">
            <LegalBridgeLogo />
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[var(--saffron-dark)]">Frontend demonstration access</p>
            <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight text-[var(--navy)] sm:text-5xl">
              Review the full safety-gated legal workflow.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--slate)]">
              This sign-in is local demonstration behaviour, not production security. It stores only an authenticated flag and email in this browser—never the password.
            </p>
            <PrototypeDisclaimer className="mt-7 max-w-xl" />
          </section>
          <Card className="shadow-xl">
            <CardHeader className="border-b border-[var(--border)] p-6">
              <CardTitle className="text-2xl">Demo attorney sign-in</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--slate)]">Use the closed credentials below. Invalid values show a controlled error.</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4" aria-hidden="true" /> Demo credentials</div>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-[5rem_1fr]">
                  <dt className="font-semibold">Email</dt><dd className="break-all font-mono">attorney@legalbridge.demo</dd>
                  <dt className="font-semibold">Password</dt><dd className="break-all font-mono">LegalBridge@2026</dd>
                  <dt className="font-semibold">Review PIN</dt><dd className="font-mono">2026</dd>
                </dl>
              </div>
              <Suspense fallback={<p className="text-sm text-[var(--slate)]">Preparing sign-in form…</p>}>
                <SignInForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
