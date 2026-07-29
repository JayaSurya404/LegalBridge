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
        <div className="mt-6 flex justify-end gap-3">
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
      <Button variant="secondary">Cancel</Button>
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
      <Button variant={destructive ? "danger" : "default"} onClick={onConfirm}>
        {label}
      </Button>
    </DialogClose>
  );
}
