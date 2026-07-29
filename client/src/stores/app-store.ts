"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  agentDefinitions,
  DEMO_CASE_ID,
  seedAuditEvents,
  seedCase,
} from "@/lib/demo/seed";
import { getMotionGateStatus } from "@/lib/motion-gate";
import type {
  AuditEvent,
  CaseRecord,
  DemoSettings,
  DocumentMeta,
  NewCaseInput,
  ReviewStatus,
} from "@/lib/types/domain";
import { makeId, stableHash } from "@/lib/utils";

interface AppState {
  hydrated: boolean;
  authenticated: boolean;
  userEmail: string | null;
  selectedCaseId: string;
  cases: CaseRecord[];
  auditEvents: AuditEvent[];
  settings: DemoSettings;
  setHydrated: (hydrated: boolean) => void;
  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
  selectCase: (caseId: string) => void;
  createCase: (input: NewCaseInput) => string;
  addDocuments: (
    caseId: string,
    documents: Omit<DocumentMeta, "id" | "addedAt">[],
  ) => number;
  processDocuments: (caseId: string) => void;
  startWorkflow: (caseId: string) => void;
  pauseWorkflow: (caseId: string) => void;
  resumeWorkflow: (caseId: string) => void;
  advanceWorkflow: (caseId: string) => void;
  resetWorkflow: (caseId: string) => void;
  setStrategyIncluded: (
    caseId: string,
    strategyId: string,
    included: boolean,
  ) => void;
  setStrategyNotes: (
    caseId: string,
    strategyId: string,
    notes: string,
  ) => void;
  reviewEthicsArgument: (
    caseId: string,
    argumentId: string,
    status: Exclude<ReviewStatus, "pending">,
  ) => void;
  saveMotion: (caseId: string, body: string) => void;
  approveMotion: (
    caseId: string,
    reviewerName: string,
    pin: string,
    confirmed: boolean,
  ) => { ok: boolean; message: string };
  recordExport: (caseId: string) => boolean;
  updateSettings: (settings: Partial<DemoSettings>) => void;
  resetDemo: () => void;
}

const now = () => new Date().toISOString();

function audit(
  caseId: string,
  type: string,
  message: string,
  actor: string,
  relatedEntity: string,
  metadata: string,
): AuditEvent {
  return {
    id: makeId("audit"),
    caseId,
    type,
    message,
    timestamp: now(),
    actor,
    relatedEntity,
    metadata,
  };
}

function updateCase(
  cases: CaseRecord[],
  caseId: string,
  updater: (record: CaseRecord) => CaseRecord,
) {
  return cases.map((record) =>
    record.id === caseId ? updater(record) : record,
  );
}

function freshSeedCase() {
  return structuredClone(seedCase);
}

function getAnalysisCompletionEvent(
  nodeId: string,
  record: CaseRecord,
):
  | {
      type: string;
      message: string;
      relatedEntity: string;
      metadata: string;
    }
  | undefined {
  if (nodeId === "agent-facts" && record.timeline.length > 0) {
    return {
      type: "analysis.facts_created",
      message: "Twenty-four source-linked demonstration facts were created.",
      relatedEntity: "fact-set",
      metadata: "Synthetic observations requiring attorney verification",
    };
  }
  if (nodeId === "agent-timeline" && record.timeline.length > 0) {
    return {
      type: "analysis.timeline_created",
      message: `${record.timeline.length} source-linked timeline events were created.`,
      relatedEntity: "timeline-set",
      metadata: "Includes the conflicting arrest-time indicators",
    };
  }
  if (
    nodeId === "agent-contradictions" &&
    record.contradictions.length > 0
  ) {
    return {
      type: "analysis.contradictions_created",
      message: `${record.contradictions.length} demonstration contradictions were created for review.`,
      relatedEntity: "contradiction-set",
      metadata: "Arrest, seizure, and witness comparisons",
    };
  }
  if (nodeId === "agent-procedure" && record.findings.length > 0) {
    return {
      type: "analysis.findings_created",
      message: `${record.findings.length} potential procedural concerns were created for attorney verification.`,
      relatedEntity: "finding-set",
      metadata: "Demonstration screening only; no violation concluded",
    };
  }
  return undefined;
}

const strategyIdByEthicsArgument: Record<string, string> = {
  "ETH-ARG-01": "STRAT-01",
  "ETH-ARG-02": "STRAT-02",
  "ETH-ARG-04": "STRAT-04",
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      authenticated: false,
      userEmail: null,
      selectedCaseId: DEMO_CASE_ID,
      cases: [freshSeedCase()],
      auditEvents: structuredClone(seedAuditEvents),
      settings: {
        reducedMotion: false,
        density: "comfortable",
        sidebarCollapsed: false,
      },
      setHydrated: (hydrated) => set({ hydrated }),
      signIn: (email, password) => {
        const valid =
          email.trim().toLowerCase() === "attorney@legalbridge.demo" &&
          password === "LegalBridge@2026";
        if (!valid) return false;
        set((state) => ({
          authenticated: true,
          userEmail: "attorney@legalbridge.demo",
          auditEvents: [
            audit(
              DEMO_CASE_ID,
              "authentication.signed_in",
              "Demo attorney signed in locally.",
              "Demo attorney",
              "workspace-session",
              "Frontend demonstration authentication",
            ),
            ...state.auditEvents,
          ],
        }));
        return true;
      },
      signOut: () =>
        set((state) => ({
          authenticated: false,
          userEmail: null,
          auditEvents: [
            audit(
              state.selectedCaseId,
              "authentication.signed_out",
              "Demo attorney signed out locally.",
              "Demo attorney",
              "workspace-session",
              "Case data preserved",
            ),
            ...state.auditEvents,
          ],
        })),
      selectCase: (caseId) => set({ selectedCaseId: caseId }),
      createCase: (input) => {
        const id = makeId("case-local");
        const createdAt = now();
        const created: CaseRecord = {
          id,
          ...input,
          status: "draft",
          synthetic: true,
          createdAt,
          reviewStatus: "pending",
          documents: [],
          workflow: {
            status: "idle",
            currentIndex: 0,
            nodes: agentDefinitions.map((node, index) => ({
              ...node,
              output:
                "No case-specific output is generated for browser-created cases because this frontend does not parse file contents. Use the preloaded synthetic matter for closed analysis fixtures.",
              sourceRefs: [],
              status: index === 0 ? "queued" : "locked",
            })),
          },
          timeline: [],
          contradictions: [],
          findings: [],
          authorities: [],
          strategies: [],
          ethicsArguments: [],
          citations: [],
          motionVersions: [],
          currentMotion: "",
          approval: null,
        };
        set((state) => ({
          cases: [...state.cases, created],
          selectedCaseId: id,
          auditEvents: [
            audit(
              id,
              "case.created",
              `Local synthetic case “${input.title}” created.`,
              "Demo attorney",
              id,
              "Stored in this browser only",
            ),
            ...state.auditEvents,
          ],
        }));
        return id;
      },
      addDocuments: (caseId, incoming) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record) return 0;
        const existingNames = new Set(
          record.documents.map((document) => document.name.toLowerCase()),
        );
        const remainingCapacity = Math.max(0, 12 - record.documents.length);
        const unique = incoming
          .filter((document) => {
            const normalizedName = document.name.toLowerCase();
            if (existingNames.has(normalizedName)) return false;
            existingNames.add(normalizedName);
            return true;
          })
          .slice(0, remainingCapacity);
        const added = unique.map((document) => ({
          ...document,
          id: makeId("doc-local"),
          addedAt: now(),
        }));
        if (added.length === 0) return 0;
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            documents: [...item.documents, ...added],
          })),
          auditEvents: [
            audit(
              caseId,
              "documents.selected",
              `${added.length} document record${added.length === 1 ? "" : "s"} selected.`,
              "Demo attorney",
              added.map((item) => item.id).join(", "),
              "Metadata only; no backend upload",
            ),
            ...state.auditEvents,
          ],
        }));
        return added.length;
      },
      processDocuments: (caseId) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (
          !record ||
          !record.documents.some((document) => document.status !== "processed")
        ) {
          return;
        }
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            documents: item.documents.map((document) => ({
              ...document,
              status: "processed",
            })),
          })),
          auditEvents: [
            audit(
              caseId,
              "documents.processed",
              "Selected document metadata completed deterministic simulated processing.",
              "Deterministic simulator",
              "document-set",
              "No parsing or upload occurred",
            ),
            ...state.auditEvents,
          ],
        }));
      },
      startWorkflow: (caseId) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (
          !record ||
          record.workflow.status !== "idle" ||
          record.documents.length === 0 ||
          record.documents.some((document) => document.status !== "processed")
        ) {
          return;
        }
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            workflow: {
              ...item.workflow,
              status: "running",
              startedAt: item.workflow.startedAt ?? now(),
              nodes: item.workflow.nodes.map((node, index) => ({
                ...node,
                status:
                  index === item.workflow.currentIndex
                    ? "running"
                    : node.status,
              })),
            },
          })),
          auditEvents: [
            audit(
              caseId,
              "workflow.started",
              "Deterministic frontend workflow started.",
              "Demo attorney",
              "workflow-run",
              "Fixed 15-agent order",
            ),
            ...state.auditEvents,
          ],
        }));
      },
      pauseWorkflow: (caseId) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record || record.workflow.status !== "running") return;
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            workflow: { ...item.workflow, status: "paused" },
          })),
          auditEvents: [
            audit(
              caseId,
              "workflow.paused",
              "Deterministic frontend workflow paused.",
              "Demo attorney",
              "workflow-run",
              "State retained locally",
            ),
            ...state.auditEvents,
          ],
        }));
      },
      resumeWorkflow: (caseId) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record || record.workflow.status !== "paused") return;
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            workflow: { ...item.workflow, status: "running" },
          })),
          auditEvents: [
            audit(
              caseId,
              "workflow.resumed",
              "Deterministic frontend workflow resumed.",
              "Demo attorney",
              "workflow-run",
              "Continued from retained node",
            ),
            ...state.auditEvents,
          ],
        }));
      },
      advanceWorkflow: (caseId) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record || record.workflow.status !== "running") return;
        const currentIndex = record.workflow.currentIndex;
        const completedNode = record.workflow.nodes[currentIndex];
        if (!completedNode) return;
        const isFinal = currentIndex === record.workflow.nodes.length - 1;
        const events = [
          audit(
            caseId,
            "workflow.agent_completed",
            `${completedNode.name} completed.`,
            "Deterministic simulator",
            completedNode.id,
            `${completedNode.durationMs} ms simulated duration`,
          ),
        ];
        const analysisEvent = getAnalysisCompletionEvent(
          completedNode.id,
          record,
        );
        if (analysisEvent) {
          events.unshift(
            audit(
              caseId,
              analysisEvent.type,
              analysisEvent.message,
              "Deterministic simulator",
              analysisEvent.relatedEntity,
              analysisEvent.metadata,
            ),
          );
        }
        if (isFinal) {
          events.unshift(
            audit(
              caseId,
              "workflow.completed",
              "Deterministic frontend workflow completed at the attorney review boundary.",
              "Deterministic simulator",
              "workflow-run",
              "No autonomous filing action exists",
            ),
          );
        }
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            workflow: {
              ...item.workflow,
              status: isFinal ? "completed" : "running",
              currentIndex: isFinal ? currentIndex : currentIndex + 1,
              completedAt: isFinal ? now() : undefined,
              nodes: item.workflow.nodes.map((node, index) => ({
                ...node,
                status:
                  index <= currentIndex
                    ? "completed"
                    : index === currentIndex + 1
                      ? "running"
                      : "locked",
              })),
            },
          })),
          auditEvents: [...events, ...state.auditEvents],
        }));
      },
      resetWorkflow: (caseId) =>
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            workflow: {
              status: "idle",
              currentIndex: 0,
              nodes: agentDefinitions.map((node, index) => ({
                ...node,
                status: index === 0 ? "queued" : "locked",
              })),
            },
          })),
          auditEvents: [
            audit(
              caseId,
              "workflow.reset",
              "Workflow progress reset; the case and source metadata were preserved.",
              "Demo attorney",
              "workflow-run",
              "Frontend-only reset",
            ),
            ...state.auditEvents,
          ],
        })),
      setStrategyIncluded: (caseId, strategyId, included) =>
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            strategies: item.strategies.map((strategy) =>
              strategy.id === strategyId &&
              strategy.ethicsStatus === "approved" &&
              strategy.citationStatus === "verified"
                ? { ...strategy, included }
                : strategy,
            ),
          })),
        })),
      setStrategyNotes: (caseId, strategyId, notes) =>
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            strategies: item.strategies.map((strategy) =>
              strategy.id === strategyId
                ? { ...strategy, attorneyNotes: notes }
                : strategy,
            ),
          })),
        })),
      reviewEthicsArgument: (caseId, argumentId, status) => {
        const record = get().cases.find((item) => item.id === caseId);
        const currentArgument = record?.ethicsArguments.find(
          (argument) => argument.id === argumentId,
        );
        if (!record || !currentArgument || currentArgument.status === status) {
          return;
        }
        const hadApproval = Boolean(record.approval);
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            ethicsArguments: item.ethicsArguments.map((argument) =>
              argument.id === argumentId
                ? {
                    ...argument,
                    status,
                    explanation:
                      status === "rejected"
                        ? "The available sources do not support the allegation. The claim exceeds the evidence and must not enter the motion. An attorney may add verified evidence later."
                        : status === "revision"
                          ? "Revise the proposition to remain within the source-linked evidence."
                          : "Approved for the demonstration draft with attorney verification still required.",
                    history: [
                      ...argument.history,
                      `${status === "rejected" ? "Rejected" : status === "revision" ? "Revision requested" : "Approved"} by demo reviewer at ${now()}.`,
                    ],
                  }
                : argument,
            ),
            strategies: item.strategies.map((strategy) =>
              strategy.id === strategyIdByEthicsArgument[argumentId]
                ? {
                    ...strategy,
                    ethicsStatus: status,
                    included:
                      status === "approved" ? strategy.included : false,
                  }
                : strategy,
            ),
            approval: hadApproval ? null : item.approval,
            reviewStatus: hadApproval ? "revision" : item.reviewStatus,
          })),
          auditEvents: [
            ...(hadApproval
              ? [
                  audit(
                    caseId,
                    "approval.invalidated",
                    "Attorney approval was invalidated because an ethics decision changed.",
                    "Demo workspace",
                    argumentId,
                    "Export locked immediately",
                  ),
                ]
              : []),
            audit(
              caseId,
              `ethics.argument_${status}`,
              `Ethics argument ${argumentId} marked ${status}.`,
              "Demo attorney",
              argumentId,
              status === "rejected"
                ? "Excluded from motion"
                : "Requires attorney verification",
            ),
            ...state.auditEvents,
          ],
        }));
      },
      saveMotion: (caseId, body) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record || body.trim() === record.currentMotion.trim()) return;
        const version =
          (record.motionVersions.at(-1)?.version ?? 0) + 1;
        const mockHash = stableHash(`${body}|${version}`);
        const hadApproval = Boolean(record.approval);
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            currentMotion: body,
            motionVersions: [
              ...item.motionVersions,
              { version, body, savedAt: now(), mockHash },
            ],
            approval: null,
            reviewStatus: hadApproval ? "revision" : item.reviewStatus,
          })),
          auditEvents: [
            ...(hadApproval
              ? [
                  audit(
                    caseId,
                    "approval.invalidated",
                    "Attorney approval was invalidated because the motion changed.",
                    "Demo workspace",
                    `motion-v${version}`,
                    "Export locked immediately",
                  ),
                ]
              : []),
            audit(
              caseId,
              "motion.edited",
              `Motion draft edited and saved as version ${version}.`,
              "Demo attorney",
              `motion-v${version}`,
              mockHash,
            ),
            ...state.auditEvents,
          ],
        }));
      },
      approveMotion: (caseId, reviewerName, pin, confirmed) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record?.currentMotion) {
          return { ok: false, message: "A motion draft must exist before review." };
        }
        if (reviewerName.trim().length < 2) {
          return { ok: false, message: "Enter the reviewing attorney’s name." };
        }
        if (pin !== "2026") {
          return { ok: false, message: "The demonstration review PIN is incorrect." };
        }
        if (!confirmed) {
          return {
            ok: false,
            message: "Confirm responsibility for final legal review.",
          };
        }
        const gate = getMotionGateStatus(record);
        if (gate.exportUnlocked) {
          return {
            ok: true,
            message: "The current motion version is already approved.",
          };
        }
        if (gate.approvalBlockers.length > 0) {
          return { ok: false, message: gate.approvalBlockers[0] };
        }
        const motionVersion = gate.currentVersion;
        if (!motionVersion) {
          return { ok: false, message: "Save the motion before approval." };
        }
        const approval = {
          reviewerName: reviewerName.trim(),
          timestamp: now(),
          version: motionVersion.version,
          mockHash: motionVersion.mockHash,
        };
        set((state) => ({
          cases: updateCase(state.cases, caseId, (item) => ({
            ...item,
            approval,
            reviewStatus: "approved",
          })),
          auditEvents: [
            audit(
              caseId,
              "approval.created",
              `Motion version ${approval.version} approved for frontend export by ${approval.reviewerName}.`,
              approval.reviewerName,
              `motion-v${approval.version}`,
              approval.mockHash,
            ),
            ...state.auditEvents,
          ],
        }));
        return {
          ok: true,
          message: "Approval recorded. Print or Save as PDF is now unlocked.",
        };
      },
      recordExport: (caseId) => {
        const record = get().cases.find((item) => item.id === caseId);
        if (!record) return false;
        const gate = getMotionGateStatus(record);
        if (!gate.exportUnlocked || !gate.currentVersion) return false;
        const latest = gate.currentVersion;
        set((state) => ({
          auditEvents: [
            audit(
              caseId,
              "export.generated",
              "Browser print or Save as PDF was opened for the approved version.",
              record.approval?.reviewerName ?? "Demo attorney",
              `motion-v${latest.version}`,
              "Not automatically filed",
            ),
            ...state.auditEvents,
          ],
        }));
        return true;
      },
      updateSettings: (nextSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...nextSettings },
        })),
      resetDemo: () =>
        set((state) => ({
          authenticated: state.authenticated,
          userEmail: state.userEmail,
          selectedCaseId: DEMO_CASE_ID,
          cases: [freshSeedCase()],
          auditEvents: [
            audit(
              DEMO_CASE_ID,
              "workspace.reset",
              "The frontend demonstration workspace was reset.",
              "Demo attorney",
              "demo-workspace",
              "Original synthetic case restored",
            ),
            ...structuredClone(seedAuditEvents),
          ],
          settings: {
            reducedMotion: state.settings.reducedMotion,
            density: state.settings.density,
            sidebarCollapsed: false,
          },
        })),
    }),
    {
      name: "legalbridge-demo-store",
      version: 1,
      partialize: (state) => ({
        authenticated: state.authenticated,
        userEmail: state.userEmail,
        selectedCaseId: state.selectedCaseId,
        cases: state.cases,
        auditEvents: state.auditEvents,
        settings: state.settings,
      }),
      migrate: (persisted, version) => {
        if (version !== 1) {
          return {
            ...(persisted as Partial<AppState>),
            cases: [freshSeedCase()],
            selectedCaseId: DEMO_CASE_ID,
            auditEvents: structuredClone(seedAuditEvents),
          } as AppState;
        }
        return persisted as AppState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
