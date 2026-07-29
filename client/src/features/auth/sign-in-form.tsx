"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app-store";

const signInSchema = z.object({
  organizationSlug: z
    .string()
    .trim()
    .min(2, "Enter the organisation workspace slug.")
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens.",
    ),
  email: z.email("Enter a valid email address."),
  password: z.string().min(12, "Enter a password of at least 12 characters."),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authenticate = useAppStore((state) => state.authenticate);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      organizationSlug: "legalbridge-jury",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignInValues) => {
    const result = await authenticate(values);
    if (!result.ok) {
      setError("root", {
        message: result.message ?? "Sign-in could not be completed.",
      });
      return;
    }
    const requested = searchParams.get("next");
    const destination =
      requested?.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.includes("\\")
        ? requested
        : "/dashboard";
    toast.success("Signed in to the LegalBridge workspace.");
    router.replace(destination);
  };

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      <div>
        <label htmlFor="organizationSlug" className="mb-2 block text-sm font-semibold text-[var(--navy)]">
          Organisation workspace
        </label>
        <Input
          id="organizationSlug"
          autoComplete="organization"
          aria-invalid={Boolean(errors.organizationSlug)}
          aria-describedby={errors.organizationSlug ? "organizationSlug-error" : undefined}
          {...register("organizationSlug")}
        />
        {errors.organizationSlug && (
          <p id="organizationSlug-error" role="alert" className="mt-2 text-sm text-[var(--red)]">
            {errors.organizationSlug.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[var(--navy)]">
          Email
        </label>
        <Input id="email" type="email" autoComplete="username" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        {errors.email && <p id="email-error" role="alert" className="mt-2 text-sm text-[var(--red)]">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--navy)]">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="pr-12"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-[var(--slate)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        </div>
        {errors.password && <p id="password-error" role="alert" className="mt-2 text-sm text-[var(--red)]">{errors.password.message}</p>}
      </div>
      {errors.root && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errors.root.message}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        <KeyRound className="size-4" aria-hidden="true" />
        {isSubmitting ? "Signing in securely…" : "Enter workspace"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          setValue("organizationSlug", "legalbridge-jury", {
            shouldValidate: true,
          });
          setValue("email", "jury@legalbridge.local", { shouldValidate: true });
          setValue("password", "LegalBridgeJury@2026", { shouldValidate: true });
        }}
      >
        Fill recommended jury credentials
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          setValue("organizationSlug", "legalbridge-main", {
            shouldValidate: true,
          });
          setValue("email", "legalbridge@legalbridge.demo", { shouldValidate: true });
          setValue("password", "legalbridge@2026", { shouldValidate: true });
        }}
      >
        Fill legacy main credentials
      </Button>
    </form>
  );
}
