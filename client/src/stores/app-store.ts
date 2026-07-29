"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  agentDefinitions,
  DEMO_CASE_ID,
  seedAuditEvents,
  seedCase,
} from "@/lib/demo/seed";
import type { BackendDocumentMetadataCreate } from "@/lib/api/backend-types";
import {
  BackendApiError,
  legalBridgeClient,
} from "@/lib/api/client";
import {
  BACKEND_DEMO_CASE_NUMBER,
  mapBackendCase,
  mapBackendDocument,
  mapBackendUser,
  mapNewCaseRequest,
  mergeAuditEvents,
  mergeBackendDocuments,
} from "@/lib/api/mappers";
import { publicEnv } from "@/lib/env/public-env";
import { getMotionGateStatus } from "@/lib/motion-gate";
import type {
  AuditEvent,
  AuthenticatedUser,
  CaseRecord,
  DemoSettings,
  DocumentMeta,
  NewCaseInput,
  ReviewStatus,
} from "@/lib/types/domain";
import { makeId, stableHash } from "@/lib/utils";

interface AppState {
  hydrated: boolean;
  sessionRestored: boolean;
  sessionRestoring: boolean;
  authenticated: boolean;
  userEmail: string | null;
  currentUser: AuthenticatedUser | null;
  workspaceLoading: boolean;
  workspaceReady: boolean;
  workspaceError: string | null;
  selectedCaseId: string;
  cases: CaseRecord[];
  auditEvents: AuditEvent[];
  settings: DemoSettings;
  setHydrated: (hydrated: boolean) => void;
  restoreSession: () => Promise<void>;
  authenticate: (request: {
    organizationSlug: string;
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  clearSession: () => void;
  refreshWorkspace: () => Promise<void>;
  createPersistentCase: (input: NewCaseInput) => Promise<string>;
  syncDocuments: (caseId: string) => Promise<void>;
  registerDocumentMetadata: (
    caseId: string,
    document: BackendDocumentMetadataCreate,
  ) => Promise<DocumentMeta>;
  deleteDocumentMetadata: (
    caseId: string,
    documentId: string,
  ) => Promise<void>;
  syncAuditEvents: (caseId: string) => Promise<void>;
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

function backendErrorMessage(error: unknown): string {
  if (error instanceof BackendApiError) {
    const requestReference = error.requestId
      ? ` Request ID: ${error.requestId}.`
      : "";
    return `${error.message}${requestReference}`;
  }
  return "The request could not be completed. Retry after checking the backend.";
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
      sessionRestored: false,
      sessionRestoring: false,
      authenticated: false,
      userEmail: null,
      currentUser: null,
      workspaceLoading: false,
      workspaceReady: false,
      workspaceError: null,
      selectedCaseId: DEMO_CASE_ID,
      cases: [freshSeedCase()],
      auditEvents: structuredClone(seedAuditEvents),
      settings: {
        reducedMotion: false,
        density: "comfortable",
        sidebarCollapsed: false,
      },
      setHydrated: (hydrated) => set({ hydrated }),
      restoreSession: async () => {
        if (get().sessionRestoring || get().sessionRestored) return;
        set({ sessionRestoring: true, workspaceError: null });
        try {
          const backendUser = await legalBridgeClient.restoreSession();
          const user = backendUser ? mapBackendUser(backendUser) : null;
          set({
            authenticated: Boolean(user),
            userEmail: user?.email ?? null,
            currentUser: user,
            sessionRestored: true,
            sessionRestoring: false,
            workspaceReady: publicEnv.dataMode === "mock",
          });
        } catch (error) {
          set({
            authenticated: false,
            userEmail: null,
            currentUser: null,
            sessionRestored: true,
            sessionRestoring: false,
            workspaceError: backendErrorMessage(error),
          });
        }
      },
      authenticate: async ({ organizationSlug, email, password }) => {
        try {
          const response = await legalBridgeClient.login({
            organization_slug: organizationSlug,
            email,
            password,
          });
          const user = mapBackendUser(response.user);
          set({
            authenticated: true,
            userEmail: user.email,
            currentUser: user,
            sessionRestored: true,
            sessionRestoring: false,
            workspaceReady: publicEnv.dataMode === "mock",
            workspaceError: null,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, message: backendErrorMessage(error) };
        }
      },
      logout: async () => {
        try {
          await legalBridgeClient.logout();
        } catch {
          // Local session clearing below is required even when the API is unavailable.
        } finally {
          set({
            authenticated: false,
            userEmail: null,
            currentUser: null,
            sessionRestored: true,
            workspaceReady: false,
            workspaceError: null,
          });
        }
      },
      clearSession: () =>
        set({
          authenticated: false,
          userEmail: null,
          currentUser: null,
          sessionRestored: true,
          workspaceReady: false,
        }),
      refreshWorkspace: async () => {
        if (publicEnv.dataMode === "mock") {
          set({ workspaceReady: true, workspaceLoading: false });
          return;
        }
        set({ workspaceLoading: true, workspaceError: null });
        try {
          const backendCases = await legalBridgeClient.listCases();
          set((state) => {
            const mapped = backendCases.map((backendCase) => {
              const existing = state.cases.find(
                (record) =>
                  record.id === backendCase.id ||
                  (backendCase.case_number === BACKEND_DEMO_CASE_NUMBER &&
                    (record.id === DEMO_CASE_ID ||
                      record.reference === BACKEND_DEMO_CASE_NUMBER ||
                      record.reference === seedCase.reference)),
              );
              return mapBackendCase(backendCase, existing);
            });
            const demo = mapped.find(
              (record) => record.reference === BACKEND_DEMO_CASE_NUMBER,
            );
            const auditEvents = demo
              ? state.auditEvents.map((event) =>
                  event.caseId === DEMO_CASE_ID
                    ? {
                        ...event,
                        caseId: demo.id,
                        relatedEntity:
                          event.relatedEntity === DEMO_CASE_ID
                            ? demo.id
                            : event.relatedEntity,
                        source: event.source ?? "synthetic_fixture",
                      }
                    : event,
                )
              : state.auditEvents;
            const selectedCaseId = mapped.some(
              (record) => record.id === state.selectedCaseId,
            )
              ? state.selectedCaseId
              : demo?.id ?? mapped[0]?.id ?? "";
            return {
              cases: mapped,
              auditEvents,
              selectedCaseId,
              workspaceLoading: false,
              workspaceReady: true,
              workspaceError: null,
            };
          });
        } catch (error) {
          set({
            workspaceLoading: false,
            workspaceReady: true,
            workspaceError: backendErrorMessage(error),
            ...(error instanceof BackendApiError &&
            error.kind === "UNAUTHORIZED"
              ? {
                  authenticated: false,
                  userEmail: null,
                  currentUser: null,
                }
              : {}),
          });
        }
      },
      createPersistentCase: async (input) => {
        if (publicEnv.dataMode === "mock") return get().createCase(input);
        const user = get().currentUser;
        if (!user) {
          throw new BackendApiError(
            "Authentication is required.",
            "UNAUTHORIZED",
            401,
            "missing_session",
          );
        }
        const backendCase = await legalBridgeClient.createCase(
          mapNewCaseRequest(input, user),
        );
        const created = mapBackendCase(backendCase);
        set((state) => ({
          cases: [...state.cases, created],
          selectedCaseId: created.id,
        }));
        return created.id;
      },
      syncDocuments: async (caseId) => {
        if (publicEnv.dataMode === "mock") return;
        const documents = await legalBridgeClient.listDocuments(caseId);
        set((state) => ({
          cases: updateCase(state.cases, caseId, (record) => ({
            ...record,
            documents: mergeBackendDocuments(record, documents),
          })),
        }));
      },
      registerDocumentMetadata: async (caseId, input) => {
        if (publicEnv.dataMode === "mock") {
          const type =
            input.content_type === "application/pdf"
              ? "PDF"
              : input.content_type === "text/plain"
                ? "TXT"
                : "DOCX";
          const document: DocumentMeta = {
            id: makeId("doc-local"),
            name: input.original_filename,
            type,
            mimeType: input.content_type,
            size: input.size_bytes,
            status: "processed",
            addedAt: now(),
            sourceLabel: `Browser-local metadata · ${input.category}`,
            category: input.category,
            sha256: input.sha256,
            origin: "browser_local",
          };
          set((state) => ({
            cases: updateCase(state.cases, caseId, (record) => ({
              ...record,
              documents: [...record.documents, document],
            })),
          }));
          return document;
        }
        const backendDocument =
          await legalBridgeClient.createDocumentMetadata(caseId, input);
        const document = mapBackendDocument(backendDocument);
        set((state) => ({
          cases: updateCase(state.cases, caseId, (record) => ({
            ...record,
            documents: [
              ...record.documents.filter((item) => item.id !== document.id),
              document,
            ],
          })),
        }));
        return document;
      },
      deleteDocumentMetadata: async (caseId, documentId) => {
        if (publicEnv.dataMode === "http") {
          await legalBridgeClient.deleteDocumentMetadata(caseId, documentId);
        }
        set((state) => ({
          cases: updateCase(state.cases, caseId, (record) => ({
            ...record,
            documents: record.documents.filter(
              (document) => document.id !== documentId,
            ),
          })),
        }));
      },
      syncAuditEvents: async (caseId) => {
        if (publicEnv.dataMode === "mock") return;
        const events = await legalBridgeClient.listAuditEvents(caseId);
        set((state) => ({
          auditEvents: mergeAuditEvents(state.auditEvents, events),
        }));
      },
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
        set((state) => {
          const backendDemo = state.cases.find(
            (record) => record.reference === BACKEND_DEMO_CASE_NUMBER,
          );
          if (publicEnv.dataMode === "http" && backendDemo) {
            const reset = {
              ...freshSeedCase(),
              id: backendDemo.id,
              title: backendDemo.title,
              reference: backendDemo.reference,
              allegation: backendDemo.allegation,
              allegationType: backendDemo.allegationType,
              court: backendDemo.court,
              jurisdiction: backendDemo.jurisdiction,
              status: backendDemo.status,
              createdAt: backendDemo.createdAt,
              documents: backendDemo.documents,
              assignedAttorneyId: backendDemo.assignedAttorneyId,
              backendPersisted: true,
            };
            return {
              selectedCaseId: reset.id,
              cases: state.cases.map((record) =>
                record.id === reset.id ? reset : record,
              ),
              auditEvents: [
                audit(
                  reset.id,
                  "workspace.reset",
                  "The local synthetic analysis fixture was reset.",
                  state.currentUser?.fullName ?? "Workspace user",
                  "demo-workspace",
                  "Backend case and document metadata were preserved",
                ),
                ...state.auditEvents.filter(
                  (event) =>
                    event.caseId !== reset.id || event.source === "backend",
                ),
              ],
              settings: {
                reducedMotion: state.settings.reducedMotion,
                density: state.settings.density,
                sidebarCollapsed: false,
              },
            };
          }
          return {
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
          };
        }),
    }),
    {
      name: "legalbridge-demo-store",
      version: 2,
      partialize: (state) => ({
        selectedCaseId: state.selectedCaseId,
        cases: state.cases,
        auditEvents: state.auditEvents,
        settings: state.settings,
      }),
      migrate: (persisted) =>
        ({
          ...(persisted as Partial<AppState>),
          authenticated: false,
          userEmail: null,
          currentUser: null,
          sessionRestored: false,
          sessionRestoring: false,
          workspaceLoading: false,
          workspaceReady: false,
          workspaceError: null,
        }) as AppState,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
