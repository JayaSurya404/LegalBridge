export type CaseStatus = "active" | "draft" | "archived";
export type WorkflowStatus = "idle" | "running" | "paused" | "completed";
export type NodeStatus = "locked" | "queued" | "running" | "completed";
export type ReviewStatus = "pending" | "approved" | "revision" | "rejected";
export type VerificationStatus = "verified" | "review" | "blocked";

export interface DocumentMeta {
  id: string;
  name: string;
  type: "PDF" | "TXT" | "DOCX";
  mimeType: string;
  size: number;
  pages?: number;
  status: "selected" | "processing" | "processed";
  addedAt: string;
  sourceLabel: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  description: string;
  status: NodeStatus;
  durationMs: number;
  input: string;
  output: string;
  sourceRefs: string[];
}

export interface WorkflowRun {
  status: WorkflowStatus;
  currentIndex: number;
  nodes: WorkflowNode[];
  startedAt?: string;
  completedAt?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  confidence: number;
  source: string;
  location: string;
  excerpt: string;
  verified: boolean;
  conflict?: string;
}

export interface Contradiction {
  id: string;
  topic: string;
  statementA: string;
  sourceA: string;
  statementB: string;
  sourceB: string;
  severity: "high" | "medium" | "low";
  confidence: number;
  significance: string;
  reviewStatus: ReviewStatus;
  resolutionNotes: string;
}

export interface ProceduralFinding {
  id: string;
  issue: string;
  rationale: string;
  sources: string[];
  missingInformation: string;
  confidence: number;
  verificationStatus: VerificationStatus;
  reviewAction: string;
}

export interface Authority {
  id: string;
  type: "Demonstration statute" | "Demonstration precedent";
  title: string;
  jurisdiction: string;
  date: string;
  summary: string;
  passage: string;
  sourceStatus: "resolved";
  applicability: "strong" | "moderate" | "limited";
  distinguishingFacts: string;
  posture: "favourable" | "adverse" | "neutral";
}

export interface Strategy {
  id: string;
  title: string;
  factualBasis: string;
  legalBasis: string[];
  sources: string[];
  weaknesses: string;
  missingEvidence: string;
  citationStatus: VerificationStatus;
  ethicsStatus: ReviewStatus;
  included: boolean;
  attorneyNotes: string;
}

export interface EthicsArgument {
  id: string;
  title: string;
  factualSupport: string;
  legalSupport: string;
  sources: string[];
  risk: "low" | "medium" | "high";
  status: ReviewStatus;
  explanation: string;
  history: string[];
  requiredRejection?: boolean;
}

export interface CitationCheck {
  id: string;
  proposition: string;
  authorityId: string;
  sourceExists: boolean;
  metadataVerified: boolean;
  quotationVerified: boolean;
  locationVerified: boolean;
  propositionSupported: boolean;
  applicable: boolean;
  distinguishingFacts: string;
  status: "verified";
}

export interface MotionVersion {
  version: number;
  body: string;
  savedAt: string;
  mockHash: string;
}

export interface Approval {
  reviewerName: string;
  timestamp: string;
  version: number;
  mockHash: string;
}

export interface AuditEvent {
  id: string;
  caseId: string;
  type: string;
  message: string;
  timestamp: string;
  actor: string;
  relatedEntity: string;
  metadata: string;
}

export interface CaseRecord {
  id: string;
  title: string;
  reference: string;
  allegation: string;
  court: string;
  jurisdiction: string;
  clientName: string;
  advocateName: string;
  status: CaseStatus;
  synthetic: boolean;
  createdAt: string;
  reviewStatus: ReviewStatus;
  documents: DocumentMeta[];
  workflow: WorkflowRun;
  timeline: TimelineEvent[];
  contradictions: Contradiction[];
  findings: ProceduralFinding[];
  authorities: Authority[];
  strategies: Strategy[];
  ethicsArguments: EthicsArgument[];
  citations: CitationCheck[];
  motionVersions: MotionVersion[];
  currentMotion: string;
  approval: Approval | null;
}

export interface DemoSettings {
  reducedMotion: boolean;
  density: "comfortable" | "compact";
  sidebarCollapsed: boolean;
}

export interface NewCaseInput {
  title: string;
  reference: string;
  clientName: string;
  advocateName: string;
  allegation: string;
  court: string;
  jurisdiction: string;
}
