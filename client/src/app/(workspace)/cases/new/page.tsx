import { NewCaseWizard } from "@/features/cases/new-case-wizard";

export const metadata = { title: "New synthetic case" };

export default function NewCaseRoute() {
  return <NewCaseWizard />;
}
