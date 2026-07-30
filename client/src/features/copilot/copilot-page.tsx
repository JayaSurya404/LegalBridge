"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  GitCompare,
  Layers,
  MessageSquareText,
  Plus,
  Scale,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

interface QuickPrompt {
  label: string;
  icon: React.ElementType;
  question: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: "Full case summary",
    icon: BookOpen,
    question: "Summarise the entire case with sources.",
  },
  {
    label: "Timeline",
    icon: Layers,
    question: "Build the complete chronology of events.",
  },
  {
    label: "Contradictions",
    icon: Zap,
    question: "Explain all contradictions and inconsistencies found in the records.",
  },
  {
    label: "Compare witnesses",
    icon: GitCompare,
    question:
      "Compare the two witness statements and highlight every difference.",
  },
  {
    label: "Seal-code issue",
    icon: Scale,
    question:
      "Explain the seal-code inconsistency across the documents.",
  },
  {
    label: "Similar cases",
    icon: Sparkles,
    question:
      "Find similar completed cases from the same organisation involving evidence-seal inconsistencies.",
  },
  {
    label: "Arrest memo",
    icon: FileText,
    question: "Summarise 05_arrest_memo.txt.",
  },
];

function SourceChips({
  refs,
}: {
  refs: Array<{ label: string; document_id?: string; page_id?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? refs : refs.slice(0, 4);
  if (refs.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--slate)]">
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <span
            key={s.label}
            className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs text-blue-800"
          >
            {s.label}
          </span>
        ))}
        {refs.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2.5 py-0.5 text-xs text-[var(--slate)] hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" aria-hidden="true" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="size-3" aria-hidden="true" />
                {refs.length - 4} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ThreadSelector({
  threads,
  activeId,
  onSelect,
  onNew,
  creating,
}: {
  threads: Array<{ id: string; title: string; messages: unknown[] }>;
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onNew: () => void;
  creating: boolean;
}) {
  if (threads.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {threads.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
            t.id === activeId
              ? "border-[var(--navy)] bg-[var(--navy)] text-white"
              : "border-[var(--border)] bg-white text-[var(--navy)] hover:bg-[var(--cream)]"
          }`}
        >
          {t.title}
        </button>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={onNew}
        disabled={creating}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        New thread
      </Button>
    </div>
  );
}

export function CopilotPage() {
  const { caseId, record } = useCaseRecord();

  // analysisSummaries is keyed by caseId — threads are already isolated per case
  const summary = useAppStore((state) => state.analysisSummaries[caseId]);
  const createThread = useAppStore(
    (state) => state.createPersistentCopilotThread,
  );
  const sendMessage = useAppStore(
    (state) => state.sendPersistentCopilotMessage,
  );

  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  // activeThreadId is local to this render — no cross-case leakage possible
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    undefined,
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  if (!record) return <UnknownCase />;

  // Threads from the analysisSummary for this specific case only
  const threads = summary?.copilot_threads ?? [];

  // Resolve active thread: prefer local selection, then first in list for this case
  const activeThread =
    threads.find((t) => t.id === activeThreadId) ?? threads[0];

  const handleNewThread = async () => {
    setCreating(true);
    try {
      const id = await createThread(caseId);
      setActiveThreadId(id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create thread.",
      );
    } finally {
      setCreating(false);
    }
  };

  const applyQuickPrompt = (q: string) => {
    setQuestion(q);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = question.trim();
    if (!content) return;
    setSending(true);
    try {
      let threadId = activeThread?.id;
      if (!threadId) {
        threadId = await createThread(caseId);
        setActiveThreadId(threadId);
      }
      await sendMessage(caseId, threadId, content);
      setQuestion("");
      // Scroll to bottom after response
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Copilot request failed.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Case-aware Legal Copilot"
      description="Answers retrieve only this case's extracted pages and analysis. No invented facts, files, or precedents."
    >
      {/* Quick prompts */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--slate)]">
          Quick prompts
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Quick prompt shortcuts"
        >
          {QUICK_PROMPTS.map(({ label, icon: Icon, question: q }) => (
            <button
              key={label}
              type="button"
              role="listitem"
              onClick={() => applyQuickPrompt(q)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--navy)] transition-colors hover:border-[var(--navy)] hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            >
              <Icon className="size-3.5 shrink-0 text-[var(--saffron-dark)]" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread selector — shows threads from THIS case only */}
      <ThreadSelector
        threads={threads}
        activeId={activeThread?.id}
        onSelect={setActiveThreadId}
        onNew={handleNewThread}
        creating={creating}
      />

      {/* Messages */}
      {!activeThread ? (
        <EmptyState
          title="No Copilot thread for this case"
          description="Use a quick prompt or type a question to start a source-grounded conversation for this case."
        />
      ) : activeThread.messages.length === 0 ? (
        <EmptyState
          title="Thread created"
          description="Ask your first question to begin the source-grounded conversation."
        />
      ) : (
        <div
          className="mb-5 space-y-4"
          aria-live="polite"
          aria-label="Conversation messages"
        >
          {activeThread.messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-xl border p-4 ${
                message.role === "assistant"
                  ? "border-blue-200 bg-blue-50"
                  : "ml-auto max-w-3xl border-[var(--border)] bg-white"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--slate)]">
                {message.role === "assistant" ? "Legal Copilot" : "You"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                {message.content}
              </p>
              {message.role === "assistant" && (
                <SourceChips refs={message.source_references_json} />
              )}
            </article>
          ))}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      )}

      {/* Input form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Ask about this case
          </CardTitle>
          <p className="text-xs text-[var(--slate)]">
            Answers are grounded in this case&apos;s uploaded documents only. No invented sources.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Textarea
              id="copilot-question"
              aria-label="Copilot question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void submit(event as unknown as FormEvent);
                }
              }}
              placeholder="e.g. Compare the two witness statements · Explain the seal-code inconsistency · Summarise 05_arrest_memo.txt"
              rows={4}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--slate)]">
                <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">
                  Ctrl
                </kbd>
                {" + "}
                <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to send
              </p>
              <Button type="submit" disabled={sending || !question.trim()}>
                {sending ? (
                  <MessageSquareText
                    className="size-4 animate-pulse"
                    aria-hidden="true"
                  />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
                {sending ? "Thinking…" : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="mt-4 text-xs leading-5 text-[var(--slate)]">
        All Copilot responses are potential concerns and source-linked observations
        requiring attorney verification. No generated text constitutes legal advice,
        and no automatic court filing exists.
      </p>
    </CasePage>
  );
}
