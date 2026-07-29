import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export function UnknownCase() {
  return (
    <EmptyState
      title="Case not found"
      description="This case does not exist in the current workspace or you no longer have access to it. Refresh the case list to continue."
      action={
        <Link href="/cases" className={buttonVariants()}>
          Open cases
        </Link>
      }
    />
  );
}
