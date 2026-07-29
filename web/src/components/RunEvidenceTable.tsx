import { FileJson } from "lucide-react";
import type { RunDetail, RunSummary } from "../types/agent";

type RunEvidenceTableProps = {
  runs: RunSummary[];
  selectedRun?: string;
  detail: RunDetail | null;
  onSelectRun: (file: string) => void;
};

export function RunEvidenceTable({ runs, selectedRun, detail, onSelectRun }: RunEvidenceTableProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Run evidence</h2>
          <p>{runs.length} saved run file(s)</p>
        </div>
        <FileJson size={20} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Run file</th>
              <th>Version</th>
              <th>Provider</th>
              <th>Suite</th>
              <th>Accuracy</th>
              <th>Provider errors</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr className={selectedRun === run.file ? "selected" : ""} key={run.file}>
                <td>
                  <button className="link-button" type="button" onClick={() => onSelectRun(run.file)}>
                    <span>{run.file}</span>
                  </button>
                </td>
                <td>{run.version || "-"}</td>
                <td>{run.provider || "-"}</td>
                <td>{run.suite || "-"}</td>
                <td>{formatMetric(run.summary?.case_accuracy)}</td>
                <td>{String(run.summary?.provider_error_cases ?? "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="run-detail">
          <div className="run-detail-header">
            <div>
              <h3>{detail.run_id || detail.file}</h3>
              <p>{detail.artifact_version || "No artifact version"}</p>
            </div>
            <span className={detail.summary?.provider_error_cases ? "status-badge bad" : "status-badge good"}>
              {detail.summary?.provider_error_cases ? "provider errors" : "measured"}
            </span>
          </div>

          <div className="case-grid">
            {(detail.results || []).slice(0, 6).map((item) => {
              const passed = Boolean(item.result?.passed);
              return (
                <article className="case-card" key={item.id}>
                  <div>
                    <strong>{item.id}</strong>
                    <span className={passed ? "status-badge good" : "status-badge bad"}>
                      {passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <p>{String(item.metadata?.what_it_tests || "No description")}</p>
                  <code>{String(item.result?.observed_mismatch || item.result?.failure_type || "ok")}</code>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function formatMetric(value: unknown) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}
