import type { CaseRecord, MotionVersion } from "@/lib/types/domain";
import { stableHash } from "@/lib/utils";

export interface CitationFirewallMetrics {
  legalCitations: number;
  citationRecordsVerified: number;
  sourceRecordsResolved: number;
  quotationsVerified: number;
  propositionsSupported: number;
  locationsResolved: number;
  phantomCitations: number;
  unsupportedFinalClaims: number;
  ethicsRejections: number;
  allCitationChecksPass: boolean;
}

export interface MotionGateStatus {
  currentVersion: MotionVersion | undefined;
  motionExists: boolean;
  savedMotionMatches: boolean;
  ethicsRejectionApplied: boolean;
  ethicsReviewResolved: boolean;
  unsafeStrategyExcluded: boolean;
  rejectedArgumentAbsent: boolean;
  citationFirewallPass: boolean;
  approvalBlockers: string[];
  exportBlockers: string[];
  exportUnlocked: boolean;
  metrics: CitationFirewallMetrics;
}

function normalizeClaim(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const deterministicArgumentPhrases: Record<string, string[]> = {
  "ETH-ARG-01": ["custody chronology"],
  "ETH-ARG-02": ["seizure sequence"],
  "ETH-ARG-04": [
    "intentional police fabrication",
    "intentional fabrication",
  ],
};

function rejectedArgumentsIncludedInMotion(record: CaseRecord) {
  const normalizedMotion = normalizeClaim(record.currentMotion);

  return record.ethicsArguments.filter((argument) => {
    if (argument.status !== "rejected") return false;

    const normalizedTitle = normalizeClaim(argument.title);
    const coreTitle = normalizedTitle.replace(/\s+allegation$/, "");
    const broaderTitle = coreTitle
      .replace(/\bpolice\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const deterministicPhrases =
      deterministicArgumentPhrases[argument.id] ?? [];

    return [
      normalizedTitle,
      coreTitle,
      broaderTitle,
      ...deterministicPhrases,
    ]
      .filter((phrase) => phrase.length >= 12)
      .some((phrase) => normalizedMotion.includes(phrase));
  });
}

function getCurrentMotionVersion(record: CaseRecord) {
  return record.motionVersions.at(-1);
}

export function getMotionGateStatus(record: CaseRecord): MotionGateStatus {
  const currentVersion = getCurrentMotionVersion(record);
  const motionExists = record.currentMotion.trim().length >= 80;
  const savedMotionMatches = Boolean(
    currentVersion &&
      currentVersion.body.trim() === record.currentMotion.trim() &&
      currentVersion.mockHash ===
        stableHash(`${currentVersion.body}|${currentVersion.version}`),
  );
  const requiredRejection = record.ethicsArguments.find(
    (argument) => argument.requiredRejection,
  );
  const ethicsRejectionApplied = requiredRejection?.status === "rejected";
  const ethicsReviewResolved =
    record.ethicsArguments.length > 0 &&
    record.ethicsArguments.every(
      (argument) =>
        argument.status === "approved" || argument.status === "rejected",
    );
  const unsafeIncludedStrategies = record.strategies.filter(
    (strategy) =>
      strategy.included &&
      (strategy.citationStatus !== "verified" ||
        strategy.ethicsStatus !== "approved"),
  );
  const rejectedArgumentsInMotion = rejectedArgumentsIncludedInMotion(record);
  const unsafeStrategyExcluded = unsafeIncludedStrategies.length === 0;
  const rejectedArgumentAbsent = rejectedArgumentsInMotion.length === 0;

  const legalCitations = record.citations.length;
  const citationRecordsVerified = record.citations.filter(
    (citation) =>
      citation.status === "verified" &&
      citation.sourceExists &&
      citation.metadataVerified &&
      citation.quotationVerified &&
      citation.locationVerified &&
      citation.propositionSupported &&
      citation.applicable,
  ).length;
  const sourceRecordsResolved = record.citations.filter(
    (citation) => citation.sourceExists,
  ).length;
  const quotationsVerified = record.citations.filter(
    (citation) => citation.quotationVerified,
  ).length;
  const propositionsSupported = record.citations.filter(
    (citation) => citation.propositionSupported,
  ).length;
  const locationsResolved = record.citations.filter(
    (citation) => citation.locationVerified,
  ).length;
  const phantomCitations = legalCitations - sourceRecordsResolved;
  const unsupportedCitationClaims =
    legalCitations - propositionsSupported;
  const unsupportedFinalClaims =
    unsupportedCitationClaims +
    unsafeIncludedStrategies.length +
    rejectedArgumentsInMotion.length;
  const ethicsRejections = record.ethicsArguments.filter(
    (argument) => argument.status === "rejected",
  ).length;
  const allCitationChecksPass =
    legalCitations === 9 &&
    record.citations.every(
      (citation) =>
        citation.status === "verified" &&
        citation.sourceExists &&
        citation.metadataVerified &&
        citation.quotationVerified &&
        citation.locationVerified &&
        citation.propositionSupported &&
        citation.applicable,
    );
  const citationFirewallPass =
    allCitationChecksPass &&
    unsupportedFinalClaims === 0 &&
    ethicsRejectionApplied &&
    ethicsReviewResolved;

  const approvalBlockers: string[] = [];
  if (!motionExists) {
    approvalBlockers.push(
      "A substantive saved motion draft must exist before attorney review.",
    );
  }
  if (!savedMotionMatches) {
    approvalBlockers.push(
      "The current motion must match a saved version and deterministic mock hash.",
    );
  }
  if (!allCitationChecksPass) {
    approvalBlockers.push(
      "All nine citation records, sources, quotations, locations, propositions, and applicability checks must pass.",
    );
  }
  if (!ethicsRejectionApplied) {
    approvalBlockers.push(
      "The unsupported intentional-fabrication argument must be rejected.",
    );
  }
  if (!ethicsReviewResolved) {
    approvalBlockers.push(
      "Every ethics decision must be resolved; arguments awaiting revision cannot enter an approved motion.",
    );
  }
  if (!unsafeStrategyExcluded) {
    approvalBlockers.push(
      "Blocked, rejected, or unresolved strategies must be excluded.",
    );
  }
  if (!rejectedArgumentAbsent) {
    approvalBlockers.push(
      "Every ethics-rejected argument must be removed from the saved motion.",
    );
  }

  const approvalMatchesCurrent = Boolean(
    record.approval &&
      currentVersion &&
      record.approval.version === currentVersion.version &&
      record.approval.mockHash === currentVersion.mockHash,
  );
  const exportBlockers = [...approvalBlockers];
  if (!record.approval) {
    exportBlockers.push(
      "A named attorney must approve the exact saved motion version.",
    );
  } else if (!approvalMatchesCurrent) {
    exportBlockers.push(
      "The stored attorney approval does not match the current version and mock hash.",
    );
  }

  return {
    currentVersion,
    motionExists,
    savedMotionMatches,
    ethicsRejectionApplied,
    ethicsReviewResolved,
    unsafeStrategyExcluded,
    rejectedArgumentAbsent,
    citationFirewallPass,
    approvalBlockers,
    exportBlockers,
    exportUnlocked: exportBlockers.length === 0,
    metrics: {
      legalCitations,
      citationRecordsVerified,
      sourceRecordsResolved,
      quotationsVerified,
      propositionsSupported,
      locationsResolved,
      phantomCitations,
      unsupportedFinalClaims,
      ethicsRejections,
      allCitationChecksPass,
    },
  };
}
