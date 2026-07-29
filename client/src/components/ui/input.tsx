import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-base text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--saffron)] focus:ring-2 focus:ring-[var(--focus-soft)] disabled:bg-slate-100 sm:text-sm",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
