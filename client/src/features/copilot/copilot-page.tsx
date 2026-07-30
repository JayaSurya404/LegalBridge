"use client";

import { MessageSquareText, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

export function CopilotPage() {
  const { caseId, record } = useCaseRecord();
  const summary = useAppStore((state) => state.analysisSummaries[caseId]);
  const createThread = useAppStore(
    (state) => state.createPersistentCopilotThread,
  );
  const sendMessage = useAppStore(
    (state) => state.sendPersistentCopilotMessage,
  );
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const thread = summary?.copilot_threads[0];

  if (!record) return <UnknownCase />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = question.trim();
    if (!content) return;
    setSending(true);
    try {
      const threadId = thread?.id ?? (await createThread(caseId));
      await sendMessage(caseId, threadId, content);
      setQuestion("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copilot request failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Case-aware Legal Copilot"
      description="Answers retrieve only the selected case's extracted pages and persisted analysis, with inline source references."
    >
      {!thread ? (
        <EmptyState
          title="No Copilot thread yet"
          description="Ask a source-grounded question to create a persisted case thread."
        />
      ) : (
        <div className="mb-5 space-y-3" aria-live="polite">
          {thread.messages.map((message) => (
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
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>
              {message.source_references_json.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.source_references_json.map((source) => (
                    <span
                      key={`${message.id}-${source.label}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--navy)]"
                    >
                      {source.label}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border bg-white p-4">
        <label
          htmlFor="copilot-question"
          className="text-sm font-semibold text-[var(--navy)]"
        >
          Ask about this case
        </label>
        <Textarea
          id="copilot-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="mt-2"
          placeholder="What should the attorney review next?"
          rows={4}
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={sending || !question.trim()}>
            {sending ? (
              <MessageSquareText className="size-4" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Send
          </Button>
        </div>
      </form>
    </CasePage>
  );
}
