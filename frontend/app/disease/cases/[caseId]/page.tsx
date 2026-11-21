import { DiseaseCase } from "@/components/DiseaseCases";
import { DashboardShell } from "@/components/DashboardShell";
import { Suspense } from "react";

export default function DiseaseCasePage({ params }: PageProps<"/disease/cases/[caseId]">) {
  return (
    <Suspense fallback={<DiseaseCaseLoading />}>
      <DiseaseCaseContent params={params} />
    </Suspense>
  );
}

async function DiseaseCaseContent({ params }: Pick<PageProps<"/disease/cases/[caseId]">, "params">) {
  const { caseId } = await params;
  const id = Number(caseId);
  return <DashboardShell><DiseaseCase caseId={Number.isSafeInteger(id) && id > 0 ? id : -1} /></DashboardShell>;
}

function DiseaseCaseLoading() {
  return (
    <DashboardShell>
      <p className="mx-auto max-w-4xl px-5 py-10 text-slate-600 sm:px-8">Loading case…</p>
    </DashboardShell>
  );
}
