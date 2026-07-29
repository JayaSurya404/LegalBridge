import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full resize-y rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-base leading-7 text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--saffron)] focus:ring-2 focus:ring-[var(--focus-soft)] disabled:bg-slate-100 sm:text-sm",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
