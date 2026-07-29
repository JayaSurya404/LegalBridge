import Image from "next/image";
import { cn } from "@/lib/utils";

export function LegalBridgeLogo({
  compact = false,
  inverse = false,
  className,
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image src="/icon.svg" alt="" width={40} height={40} aria-hidden="true" />
      {!compact && (
        <span className="leading-tight">
          <span
            className={cn(
              "block font-serif text-lg font-bold",
              inverse ? "text-white" : "text-[var(--navy)]",
            )}
          >
            LegalBridge India
          </span>
          <span
            className={cn(
              "block text-[10px] font-semibold uppercase tracking-[0.16em]",
              inverse ? "text-slate-300" : "text-[var(--slate)]",
            )}
          >
            Attorney-assistance prototype
          </span>
        </span>
      )}
    </span>
  );
}
