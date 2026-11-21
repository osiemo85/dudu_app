import type { AdvisoryContext } from "@/lib/advisory";
export function Evidence({ result }: { result: AdvisoryContext }) {
  return (
    <div className="provenance">
      <p>
        <strong>Context used:</strong> {result.location.label} ·{" "}
        {result.season.label}
        {result.season.period ? ` (${result.season.period})` : ""}
      </p>
      <p>{result.season.basis}</p>
      {result.location.correction_note && (
        <p>{result.location.correction_note}</p>
      )}
      <p className="mt-2">
        <strong>{result.confidence.level} evidence confidence:</strong>{" "}
        {result.confidence.explanation}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer py-3 font-semibold">
          Sources & limitations ({result.sources.length})
        </summary>
        {result.sources.map((source, i) => (
          <div key={i} className="mb-3">
            <strong>{source.name}</strong>
            <p>
              {source.date} · {source.geographic_scope} ·{" "}
              {source.evidence_status}
            </p>
            <p>{source.limitations}</p>
          </div>
        ))}
      </details>
      <p className="mt-3">{result.disclaimer}</p>
    </div>
  );
}
