import { AdminWorkspace } from "@/components/AdminWorkspace";
import { Suspense } from "react";

export default function CropHealthDatabasePage({ params }: PageProps<"/disease/admin/[table]">) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-600">Loading information database…</main>}>
      <DatabaseContent params={params} />
    </Suspense>
  );
}

async function DatabaseContent({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  return <section className="admin-page"><AdminWorkspace table={table} /></section>;
}
