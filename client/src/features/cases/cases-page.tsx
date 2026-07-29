"use client";

import { BriefcaseBusiness, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";

export function CasesPage() {
  const cases = useAppStore((state) => state.cases);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [review, setReview] = useState("all");
  const filtered = useMemo(
    () =>
      cases.filter((record) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          record.title.toLowerCase().includes(query) ||
          record.reference.toLowerCase().includes(query) ||
          record.clientName.toLowerCase().includes(query);
        return (
          matchesSearch &&
          (status === "all" || record.status === status) &&
          (review === "all" || record.reviewStatus === review)
        );
      }),
    [cases, review, search, status],
  );

  return (
    <>
      <PageHeader
        eyebrow="Case management"
        title="Cases"
        description="Search the preloaded synthetic matter or create a browser-local demonstration case."
        actions={
          <Link href="/cases/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden="true" /> New case
          </Link>
        }
      />
      <Card className="mb-5">
        <CardContent className="grid gap-3 pt-5 md:grid-cols-[1fr_12rem_12rem]">
          <label className="relative">
            <span className="sr-only">Search cases</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--slate)]" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, reference, or synthetic client" className="pl-10" />
          </label>
          <label>
            <span className="sr-only">Filter by case status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
              <option value="all">All case statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by review status</span>
            <select value={review} onChange={(event) => setReview(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
              <option value="all">All review states</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="revision">Revision required</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No cases match these filters"
          description="Clear the search and filters, or create a new synthetic demonstration case."
          action={<button type="button" className={buttonVariants({ variant: "secondary" })} onClick={() => { setSearch(""); setStatus("all"); setReview("all"); }}>Clear filters</button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-[var(--saffron-dark)]">
                    <BriefcaseBusiness className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusBadge status={record.status} />
                    <StatusBadge status={record.reviewStatus} />
                  </div>
                </div>
                <h2 className="mt-4 font-serif text-xl font-semibold text-[var(--navy)]">{record.title}</h2>
                <p className="mt-1 break-all font-mono text-xs text-[var(--slate)]">{record.reference}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--slate)]">{record.allegation}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 text-xs">
                  <div><dt className="text-[var(--slate)]">Documents</dt><dd className="mt-1 font-semibold">{record.documents.length}</dd></div>
                  <div><dt className="text-[var(--slate)]">Workflow</dt><dd className="mt-1 capitalize font-semibold">{record.workflow.status}</dd></div>
                </dl>
                <Link href={`/cases/${record.id}`} className={`${buttonVariants({ variant: "secondary" })} mt-5 w-full`}>
                  Open case
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
