"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, FileLock2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { PrototypeDisclaimer } from "@/components/shared/disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const schema = z.object({
  title: z.string().trim().min(4, "Enter a case title of at least 4 characters.").max(100),
  reference: z.string().trim().min(4, "Enter a fictional reference.").max(60),
  clientName: z.string().trim().min(3, "Enter a synthetic client name.").max(80),
  advocateName: z.string().trim().min(3, "Enter a synthetic advocate name.").max(80),
  allegation: z.string().trim().min(20, "Provide at least 20 characters of synthetic context.").max(600),
  court: z.string().trim().min(4, "Enter a synthetic review forum.").max(100),
  jurisdiction: z.string().trim().min(4, "Enter a demonstration jurisdiction.").max(100),
});

type Values = z.infer<typeof schema>;
type FieldName = keyof Values;

const steps: { title: string; description: string; fields: FieldName[] }[] = [
  { title: "Case identity", description: "Use fictional identifiers only.", fields: ["title", "reference"] },
  { title: "Parties and representation", description: "Create synthetic names for the demo.", fields: ["clientName", "advocateName"] },
  { title: "Allegation summary", description: "Describe fictional case context carefully.", fields: ["allegation"] },
  { title: "Jurisdiction and context", description: "Use a closed demonstration forum.", fields: ["court", "jurisdiction"] },
  { title: "Document preparation", description: "Files are added after case creation.", fields: [] },
  { title: "Review and create", description: "Confirm the browser-local case record.", fields: [] },
];

export function NewCaseWizard() {
  const router = useRouter();
  const createCase = useAppStore((state) => state.createCase);
  const [step, setStep] = useState(0);
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      reference: "",
      clientName: "",
      advocateName: "",
      allegation: "",
      court: "Synthetic District Review Forum",
      jurisdiction: "Closed demonstration jurisdiction",
    },
  });
  const values = getValues();

  const next = async () => {
    const valid = await trigger(steps[step].fields, { shouldFocus: true });
    if (valid) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = (data: Values) => {
    const caseId = createCase(data);
    toast.success("Synthetic case created in this browser.");
    router.push(`/cases/${caseId}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Browser-local case creation"
        title="Create a synthetic case"
        description="Build a fictional demonstration matter without entering personal, confidential, or real client information."
      />
      <PrototypeDisclaimer className="mb-6" compact />
      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <nav aria-label="Case creation steps">
          <ol className="space-y-2">
            {steps.map((item, index) => (
              <li
                key={item.title}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-sm",
                  index === step
                    ? "border-[var(--saffron)] bg-amber-50"
                    : index < step
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-[var(--border)] bg-white",
                )}
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", index < step ? "bg-[var(--green)] text-white" : "bg-[var(--navy)] text-white")}>
                  {index < step ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                </span>
                <span>
                  <span className="block font-semibold text-[var(--navy)]">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--slate)]">{item.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </nav>

        <Card>
          <CardHeader className="border-b border-[var(--border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--saffron-dark)]">Step {step + 1} of {steps.length}</p>
            <CardTitle className="mt-2 text-2xl">{steps[step].title}</CardTitle>
            <p className="mt-1 text-sm text-[var(--slate)]">{steps[step].description}</p>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit(submit)} noValidate>
              {step === 0 && (
                <div className="grid gap-5">
                  <Field label="Case title" id="title" error={errors.title?.message}>
                    <Input id="title" placeholder="e.g. Synthetic Tenancy Papers Matter" {...register("title")} />
                  </Field>
                  <Field label="Fictional reference" id="reference" error={errors.reference?.message}>
                    <Input id="reference" placeholder="LB-DEMO-2026-002" {...register("reference")} />
                  </Field>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Synthetic client name" id="clientName" error={errors.clientName?.message}>
                    <Input id="clientName" placeholder="Client name (synthetic)" {...register("clientName")} />
                  </Field>
                  <Field label="Synthetic advocate name" id="advocateName" error={errors.advocateName?.message}>
                    <Input id="advocateName" placeholder="Advocate name (synthetic)" {...register("advocateName")} />
                  </Field>
                </div>
              )}
              {step === 2 && (
                <Field label="Fictional allegation summary" id="allegation" error={errors.allegation?.message}>
                  <Textarea id="allegation" rows={7} placeholder="Describe a fictional allegation and procedural context. Do not enter real personal data." {...register("allegation")} />
                </Field>
              )}
              {step === 3 && (
                <div className="grid gap-5">
                  <Field label="Synthetic review forum" id="court" error={errors.court?.message}>
                    <Input id="court" {...register("court")} />
                  </Field>
                  <Field label="Demonstration jurisdiction" id="jurisdiction" error={errors.jurisdiction?.message}>
                    <Input id="jurisdiction" {...register("jurisdiction")} />
                  </Field>
                </div>
              )}
              {step === 4 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-950">
                  <FileLock2 className="size-8" aria-hidden="true" />
                  <h3 className="mt-4 font-serif text-xl font-semibold">Document metadata comes next</h3>
                  <p className="mt-2 text-sm leading-6">
                    After creating the case, open Documents to select PDF, TXT, or DOCX files. No file is sent to a server, and binary content is never saved to localStorage.
                  </p>
                </div>
              )}
              {step === 5 && (
                <dl className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-5 text-sm sm:grid-cols-2">
                  {[
                    ["Case title", values.title],
                    ["Reference", values.reference],
                    ["Synthetic client", values.clientName],
                    ["Synthetic advocate", values.advocateName],
                    ["Forum", values.court],
                    ["Jurisdiction", values.jurisdiction],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--slate)]">{label}</dt>
                      <dd className="mt-1 break-words font-semibold text-[var(--navy)]">{value}</dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--slate)]">Allegation summary</dt>
                    <dd className="mt-1 leading-6 text-[var(--ink)]">{values.allegation}</dd>
                  </div>
                </dl>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => step === 0 ? router.push("/cases") : setStep((current) => current - 1)}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> {step === 0 ? "Cancel" : "Back"}
                </Button>
                {step < steps.length - 1 ? (
                  <Button type="button" onClick={next}>
                    Continue <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating case…" : "Create browser-local case"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[var(--navy)]">{label}</label>
      {children}
      {error && <p role="alert" className="mt-2 text-sm text-[var(--red)]">{error}</p>}
    </div>
  );
}
