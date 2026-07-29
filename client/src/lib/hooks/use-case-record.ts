"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";

export function useCaseRecord() {
  const params = useParams<{ caseId: string }>();
  const caseId = typeof params.caseId === "string" ? params.caseId : "";
  const record = useAppStore((state) =>
    state.cases.find((item) => item.id === caseId),
  );
  const selectedCaseId = useAppStore((state) => state.selectedCaseId);
  const selectCase = useAppStore((state) => state.selectCase);

  useEffect(() => {
    if (record && selectedCaseId !== caseId) {
      selectCase(caseId);
    }
  }, [caseId, record, selectCase, selectedCaseId]);

  return { caseId, record };
}
