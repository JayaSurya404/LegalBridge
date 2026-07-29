import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export function UnknownCase() {
  return (
    <EmptyState
      title="Case not found"
      description="This browser-local case does not exist or the demo workspace was reset. Open the case list to continue."
      action={
        <Link href="/cases" className={buttonVariants()}>
          Open cases
        </Link>
      }
    />
  );
}
