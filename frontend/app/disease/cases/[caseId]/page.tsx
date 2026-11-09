import { DiseaseCase } from "@/components/DiseaseCases";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DiseaseCasePage({ params }: PageProps<"/disease/cases/[caseId]">) {
  const { caseId } = await params;
  const id = Number(caseId);
  return <DashboardShell><DiseaseCase caseId={Number.isSafeInteger(id) && id > 0 ? id : -1} /></DashboardShell>;
}
