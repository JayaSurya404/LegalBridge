import type { ReactNode } from "react";
import { CaseNavigation } from "@/components/navigation/case-navigation";
import { PageHeader } from "@/components/shared/page-header";

export function CasePage({
  caseId,
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  caseId: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      <CaseNavigation caseId={caseId} />
      {children}
    </>
  );
}
