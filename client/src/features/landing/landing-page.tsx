"use client";

import {
  ArrowRight,
  BookCheck,
  CheckCircle2,
  FileSearch,
  Gavel,
  Network,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import Link from "next/link";
import { LegalBridgeLogo } from "@/components/brand/legalbridge-logo";
import { PrototypeDisclaimer, SyntheticBadge } from "@/components/shared/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const workflow = [
  { icon: FileSearch, title: "Ground every observation", body: "Facts remain linked to closed synthetic source spans so attorneys can inspect what supports each statement." },
  { icon: Network, title: "Coordinate review agents", body: "Database-backed workflow agents organise the timeline, conflicts, research, strategy, ethics, and draft." },
  { icon: ShieldCheck, title: "Apply the Citation Firewall", body: "Missing sources, unsupported propositions, and rejected arguments block export by design." },
  { icon: UserCheck, title: "Stop at attorney review", body: "Only a named reviewer can approve the exact saved version. Any later edit revokes approval." },
];

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--warm-white)]">
        <header className="border-b border-[var(--border)] bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <LegalBridgeLogo />
            <nav aria-label="Public navigation" className="flex items-center gap-2">
              <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
                Sign in
              </Link>
              <Link href="/sign-in" className={buttonVariants({ size: "sm" })}>
                <span className="sm:hidden">Enter Jury</span>
                <span className="hidden sm:inline">Enter Jury Workspace</span>
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content">
          <section className="relative overflow-hidden border-b border-[var(--border)]">
            <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[linear-gradient(135deg,transparent_8%,rgba(229,151,45,.08)_8%,rgba(229,151,45,.08)_9%,transparent_9%,transparent_18%,rgba(16,35,63,.05)_18%,rgba(16,35,63,.05)_19%,transparent_19%)] lg:block" />
            <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-28">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <SyntheticBadge />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[var(--saffron-dark)]">
                  SDGGAIP016 · SDG 16.3 + SDG 10.3
                </p>
                <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--navy)] sm:text-6xl">
                  Source-linked legal assistance, built to stop before filing.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--slate)]">
                  LegalBridge India is a full-stack attorney-assistance platform for legal-aid lawyers. FastAPI privately stores validated originals, extracted source pages, and review-gated analysis in Supabase PostgreSQL.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
                    Enter Jury Workspace <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <a href="#how-it-works" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                    See the safety workflow
                  </a>
                </div>
                <p className="mt-5 text-sm font-semibold text-[var(--navy)]">
                  “Autonomous until review, never autonomous at filing.”
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.08 }}
                className="self-center"
              >
                <Card className="overflow-hidden border-[var(--navy)]/15 bg-[var(--navy)] text-white shadow-2xl">
                  <CardHeader className="border-b border-white/10 p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">The non-negotiable gate</p>
                    <CardTitle className="mt-2 text-2xl text-white">No source, no legal claim.<br />No lawyer approval, no export.</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    {[
                      "9 of 9 synthetic citations resolved",
                      "0 phantom citations",
                      "1 unsupported argument rejected",
                      "Export locked until attorney approval",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-300" aria-hidden="true" />
                        {item}
                      </div>
                    ))}
                    <p className="pt-2 text-xs leading-5 text-slate-300">
                      These are synthetic legal-aid dataset metrics. No real legal corpus or court system is connected.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--saffron-dark)]">Designed for reviewability</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[var(--navy)] sm:text-4xl">A calm workspace for difficult source material</h2>
              <p className="mt-4 text-base leading-7 text-[var(--slate)]">
                The platform makes every handoff visible, treats uncertainty as a first-class state, and prevents fictional authority from masquerading as verified law.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {workflow.map((item, index) => (
                <Card key={item.title} className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-xl bg-[var(--cream)] text-[var(--saffron-dark)]">
                        <item.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-serif text-2xl text-slate-300">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-semibold text-[var(--navy)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--slate)]">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="border-y border-[var(--border)] bg-[var(--cream)]">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
              <article>
                <Scale className="size-7 text-[var(--saffron-dark)]" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-2xl font-semibold text-[var(--navy)]">SDG 16.3 · Access to justice</h2>
                <p className="mt-3 leading-7 text-[var(--slate)]">
                  The concept aims to reduce the time legal-aid teams spend assembling source-linked case records while preserving professional accountability.
                </p>
              </article>
              <article>
                <BookCheck className="size-7 text-[var(--green)]" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-2xl font-semibold text-[var(--navy)]">SDG 10.3 · Equal opportunity</h2>
                <p className="mt-3 leading-7 text-[var(--slate)]">
                  The platform explores a more consistent, auditable path for reviewing procedural concerns without presenting AI output as legal judgment.
                </p>
              </article>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
              <div>
                <Gavel className="size-7 text-[var(--saffron-dark)]" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-3xl font-semibold text-[var(--navy)]">Clear about what this is—and is not</h2>
                <p className="mt-4 leading-7 text-[var(--slate)]">
                  This workspace includes real authentication, private document storage, source-page extraction, reviewable analysis, citation checks, and attorney-gated motion drafting. It never performs automatic court filing.
                </p>
              </div>
              <PrototypeDisclaimer />
            </div>
          </section>
        </main>

        <footer className="border-t border-[var(--border)] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[var(--slate)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <LegalBridgeLogo />
            <p className="max-w-xl text-xs leading-5 lg:text-right">
              LegalBridge India · Problem statement SDGGAIP016 · Synthetic legal-aid dataset · Not legal advice · Attorney review required · No automatic court filing.
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
