"use client";

import { useParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

export function useCaseRecord() {
  const params = useParams<{ caseId: string }>();
  const caseId = typeof params.caseId === "string" ? params.caseId : "";
  const record = useAppStore((state) =>
    state.cases.find((item) => item.id === caseId),
  );
  return { caseId, record };
}
