import { GitCompareArrows } from "lucide-react";
import type { VersionLogRow } from "../types/agent";

type VersionEvidenceProps = {
  rows: VersionLogRow[];
};

export function VersionEvidence({ rows }: VersionEvidenceProps) {
  return (
    <section className="panel versions-panel">
      <div className="panel-heading">
        <div>
          <h2>Version evidence</h2>
          <p>Prompt and tool changes tracked from artifacts/version_log.csv</p>
        </div>
        <GitCompareArrows size={20} />
      </div>

      <div className="version-timeline">
        {rows.map((row) => (
          <article className="version-card" key={`${row.version}-${row.artifact_version}`}>
            <div className="version-card-top">
              <strong>{row.version}</strong>
              <span>
                {row.metric_name}: {row.metric_before || "--"} {"->"} {row.metric_after || "--"}
              </span>
            </div>
            <h3>{row.changed_artifact || "artifact change"}</h3>
            <p>{row.reason}</p>
            <small>{row.run_file}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
