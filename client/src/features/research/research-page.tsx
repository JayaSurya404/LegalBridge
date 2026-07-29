"use client";

import { BookOpenCheck, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CasePage } from "@/components/shared/case-page";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import type { Authority } from "@/lib/types/domain";

export function ResearchPage() {
  const { caseId, record } = useCaseRecord();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [posture, setPosture] = useState("all");
  const [selected, setSelected] = useState<Authority | null>(null);
  const authorities = useMemo(
    () =>
      record?.authorities.filter((authority) => {
        const search = query.trim().toLowerCase();
        return (
          (!search ||
            authority.id.toLowerCase().includes(search) ||
            authority.title.toLowerCase().includes(search) ||
            authority.summary.toLowerCase().includes(search)) &&
          (type === "all" || authority.type === type) &&
          (posture === "all" || authority.posture === posture)
        );
      }) ?? [],
    [posture, query, record?.authorities, type],
  );
  if (!record) return <UnknownCase />;

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Demonstration authority explorer"
      description="Closed synthetic records illustrate future legal-research review. They are original demo text—not verified statutes, judgments, or court citations."
    >
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p><strong>Demonstration authority — not verified legal corpus.</strong> No record on this page links to or claims verification against a real legal database.</p>
      </div>
      <Card className="mb-5">
        <CardContent className="grid gap-3 pt-5 lg:grid-cols-[1fr_15rem_12rem]">
          <label className="relative">
            <span className="sr-only">Search demonstration authorities</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--slate)]" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, title, or synthetic summary" className="pl-10" />
          </label>
          <label>
            <span className="sr-only">Filter authority type</span>
            <select value={type} onChange={(event) => setType(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
              <option value="all">All record types</option>
              <option value="Demonstration statute">Demonstration statutes</option>
              <option value="Demonstration precedent">Demonstration precedents</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter posture</span>
            <select value={posture} onChange={(event) => setPosture(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
              <option value="all">All indicators</option>
              <option value="favourable">Favourable</option>
              <option value="adverse">Adverse</option>
              <option value="neutral">Neutral</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {authorities.length === 0 ? (
        <EmptyState title="No authorities match these filters" description="Clear the filters to inspect the closed synthetic authority set." action={<Button variant="secondary" onClick={() => { setQuery(""); setType("all"); setPosture("all"); }}>Clear filters</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {authorities.map((authority) => (
            <Card key={authority.id}>
              <CardHeader className="border-b border-[var(--border)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SourceChip>{authority.id}</SourceChip>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={authority.applicability} />
                    <StatusBadge status={authority.posture} />
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl">{authority.title}</CardTitle>
                <p className="mt-1 text-xs text-[var(--slate)]">{authority.type} · {authority.jurisdiction} · {authority.date}</p>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm leading-6 text-[var(--slate)]">{authority.summary}</p>
                <blockquote className="mt-4 rounded-xl border-l-4 border-[var(--saffron)] bg-[var(--cream)] p-4 font-serif text-sm italic leading-7 text-[var(--ink)]">
                  “{authority.passage}”
                </blockquote>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[var(--green)]">Closed source record resolved</span>
                  <Button variant="secondary" size="sm" onClick={() => setSelected(authority)}>
                    <SlidersHorizontal className="size-4" aria-hidden="true" /> Review applicability
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogTitle className="pr-10 font-serif text-2xl font-semibold text-[var(--navy)]">{selected.title}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-[var(--slate)]">
                Applicability review for {selected.id}. Demonstration authority — not verified legal corpus.
              </DialogDescription>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Comparison label="Synthetic authority proposition" text={selected.passage} />
                <Comparison label="Demonstration case observation" text={
                  selected.id.includes("0001")
                    ? "Custody timestamps differ across two closed source records."
                    : selected.id.includes("0002")
                      ? "The seizure memo and witness account contain different times."
                      : "Witness accounts differ on the location of the disputed papers."
                } />
              </div>
              <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-950">Distinguishing facts</h3>
                <p className="mt-2 text-sm leading-6 text-amber-900">{selected.distinguishingFacts}</p>
              </section>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={selected.applicability} />
                <StatusBadge status="verified" />
                <span className="text-xs leading-6 text-[var(--slate)]">Synthetic citation record only</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CasePage>
  );
}

function Comparison({ label, text }: { label: string; text: string }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
      <BookOpenCheck className="size-5 text-[var(--saffron-dark)]" aria-hidden="true" />
      <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--slate)]">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{text}</p>
    </article>
  );
}
