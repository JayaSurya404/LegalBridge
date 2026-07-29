import { Suspense } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--cream)]" />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
