"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle className="pr-10 font-serif text-2xl font-semibold text-[var(--navy)]">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-6 text-[var(--slate)]">
          {description}
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <DialogPrimitiveClose />
          <DialogPrimitiveConfirm
            label={confirmLabel}
            onConfirm={onConfirm}
            destructive={destructive}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogPrimitiveClose() {
  return (
    <DialogClose asChild>
      <Button variant="secondary" className="w-full sm:w-auto">Cancel</Button>
    </DialogClose>
  );
}

function DialogPrimitiveConfirm({
  label,
  onConfirm,
  destructive,
}: {
  label: string;
  onConfirm: () => void;
  destructive: boolean;
}) {
  return (
    <DialogClose asChild>
      <Button className="w-full sm:w-auto" variant={destructive ? "danger" : "default"} onClick={onConfirm}>
        {label}
      </Button>
    </DialogClose>
  );
}
