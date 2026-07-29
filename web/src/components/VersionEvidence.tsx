import { GitCommitHorizontal } from "lucide-react";
import type { VersionLogRow } from "../types/agent";

type VersionEvidenceProps = {
  rows: VersionLogRow[];
};

export function VersionEvidence({ rows }: VersionEvidenceProps) {
  return (
    <section className="panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Version timeline</h2>
          <p>{rows.length} version log row(s)</p>
        </div>
        <GitCommitHorizontal size={20} />
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">No version_log.csv rows found.</div>
      ) : (
        <div className="version-timeline">
          {rows.map((row, index) => (
            <article className="version-card" key={`${row.version}-${index}`}>
              <div className="version-rail">
                <strong>{row.version || "v?"}</strong>
              </div>
              <div>
                <div className="version-card-top">
                  <span>{row.changed_artifact || "artifact change"}</span>
                  <small>{row.metric_name || "metric"}: {row.metric_before || "-"} {"->"} {row.metric_after || "-"}</small>
                </div>
                <h3>{row.reason || "No reason recorded"}</h3>
                <p>{row.hypothesis || "No hypothesis recorded"}</p>
                <code>{row.run_file || row.artifact_version || "No run file"}</code>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
