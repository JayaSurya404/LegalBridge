"use client";

import {
  Database,
  Gauge,
  PanelLeftClose,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PrototypeDisclaimer } from "@/components/shared/disclaimer";
import { StatusBadge } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicEnv } from "@/lib/env/public-env";
import { useAppStore } from "@/stores/app-store";

export function SettingsPage() {
  const router = useRouter();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const resetDemo = useAppStore((state) => state.resetDemo);

  return (
    <>
      <PageHeader
        eyebrow="Browser-local preferences"
        title="Settings"
        description="Adjust browser display behaviour and safely restore the closed synthetic analysis fixture."
        actions={
          <ConfirmDialog
            trigger={<Button variant="danger"><RotateCcw className="size-4" aria-hidden="true" /> Reset demo workspace</Button>}
            title="Reset local demonstration analysis?"
            description={publicEnv.dataMode === "http"
              ? "This resets the local workflow, draft, approval, and analysis fixtures for the designated synthetic matter. Backend cases, document metadata, audit events, and authentication remain intact."
              : "This clears browser-local cases, workflows, document metadata, motion drafts, approvals, and audit events, then restores the original synthetic property case. Authentication remains active."}
            confirmLabel="Reset and restore demo"
            destructive
            onConfirm={() => {
              resetDemo();
              toast.success("Demo workspace reset and synthetic case restored.");
              router.push("/dashboard");
            }}
          />
        }
      />
      <PrototypeDisclaimer className="mb-6" />
      <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display preferences</CardTitle>
              <p className="mt-1 text-sm text-[var(--slate)]">All controls apply immediately and persist in this browser.</p>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--border)]">
              <SettingRow
                icon={Sparkles}
                title="Reduced motion"
                description="Minimises transitions in addition to the operating-system preference."
                control={
                  <Toggle checked={settings.reducedMotion} label="Reduced motion" onChange={(checked) => updateSettings({ reducedMotion: checked })} />
                }
              />
              <SettingRow
                icon={Gauge}
                title="Compact data density"
                description="Reduces vertical spacing in repeated records without shrinking text."
                control={
                  <Toggle checked={settings.density === "compact"} label="Compact density" onChange={(checked) => updateSettings({ density: checked ? "compact" : "comfortable" })} />
                }
              />
              <SettingRow
                icon={PanelLeftClose}
                title="Collapsed desktop sidebar"
                description="Preserves more horizontal space for source and motion review."
                control={
                  <Toggle checked={settings.sidebarCollapsed} label="Collapsed sidebar" onChange={(checked) => updateSettings({ sidebarCollapsed: checked })} />
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Workspace data mode</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-emerald-950">
                      {publicEnv.dataMode === "http" ? "FastAPI persistence provider" : "Deterministic mock provider"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-900">
                      {publicEnv.dataMode === "http"
                        ? "Authentication, cases, document metadata, and audit events use the configured backend. Synthetic legal-analysis fixtures remain explicitly separate."
                        : "No endpoint or external service is called. The workspace remains a browser-local demonstration."}
                    </p>
                  </div>
                </div>
                <StatusBadge status={publicEnv.dataMode ?? "configuration error"} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Browser storage explanation</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-[var(--slate)]">
              <p>Authentication tokens and the verified user are retained only in sessionStorage. Versioned Zustand localStorage retains display preferences and synthetic workflow, draft, approval, and analysis state.</p>
              <p>Backend case records, document metadata, and audit events are refreshed from FastAPI. Raw file contents, passwords, review PINs, secrets, and real legal documents are not stored by the frontend.</p>
              <p>Browser-local persistence is not trusted as a security boundary and can be cleared by the browser or reset action.</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-5 text-[var(--red)]" aria-hidden="true" />
                <CardTitle>Prototype boundary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-[var(--slate)]">
              <p>FastAPI authentication and SQLite-backed case, document-metadata, and audit persistence are active. No binary or cloud storage, OCR, document parsing, backend agent execution, legal corpus, citation verification service, or automatic filing capability exists in this checkpoint.</p>
              <p className="mt-3 font-semibold text-[var(--navy)]">All legal outputs require attorney review and independent verification.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  control,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="density-card flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-[var(--saffron-dark)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-[var(--navy)]">{title}</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[var(--slate)]">{description}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${checked ? "bg-[var(--green)]" : "bg-slate-300"}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}
