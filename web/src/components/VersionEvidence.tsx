import { GitCommitHorizontal } from "lucide-react";
import type { VersionLogRow } from "../types/agent";

type VersionEvidenceProps = {
  rows: VersionLogRow[];
};

export function VersionEvidence({ rows }: VersionEvidenceProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Version evidence</h2>
          <p>{rows.length} version log row(s)</p>
        </div>
        <GitCommitHorizontal size={20} />
      </div>

      <div className="version-timeline">
        {rows.map((row, index) => (
          <article className="version-card" key={`${row.version}-${index}`}>
            <div className="version-card-top">
              <strong>{row.version || "v?"}</strong>
              <span>{row.metric_name || "metric"}: {row.metric_before || "-"} {"->"} {row.metric_after || "-"}</span>
            </div>
            <h3>{row.reason || "No reason recorded"}</h3>
            <p>{row.hypothesis || "No hypothesis recorded"}</p>
            <small>{row.run_file || row.artifact_version || "No run file"}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
