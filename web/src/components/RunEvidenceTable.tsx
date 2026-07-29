import { BarChart3, FileJson } from "lucide-react";
import { formatPercent } from "../lib/api";
import type { RunDetail, RunSummary } from "../types/agent";
import { StatusBadge } from "./StatusBadge";

type RunEvidenceTableProps = {
  runs: RunSummary[];
  selectedRun?: string;
  detail: RunDetail | null;
  onSelectRun: (filename: string) => void;
};

export function RunEvidenceTable({ runs, selectedRun, detail, onSelectRun }: RunEvidenceTableProps) {
  return (
    <section className="panel runs-panel">
      <div className="panel-heading">
        <div>
          <h2>Run evidence</h2>
          <p>{runs.length} run file(s) found in starter_v0/runs</p>
        </div>
        <BarChart3 size={20} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Version</th>
              <th>Provider</th>
              <th>Accuracy</th>
              <th>Passed</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                className={selectedRun === run.file ? "selected" : ""}
                key={run.file}
                onClick={() => onSelectRun(run.file)}
              >
                <td>
                  <button className="link-button" type="button">
                    <FileJson size={15} />
                    <span>{run.file}</span>
                  </button>
                </td>
                <td>{run.version || "--"}</td>
                <td>{run.provider || "--"}</td>
                <td>{formatPercent(run.summary.case_accuracy)}</td>
                <td>
                  {run.summary.passed_cases ?? "--"}/{run.summary.total_cases ?? "--"}
                </td>
                <td>{run.summary.provider_error_cases ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="run-detail">
          <div className="run-detail-header">
            <div>
              <h3>{detail.run_id || "Selected run"}</h3>
              <p>{detail.artifact_version}</p>
            </div>
            <StatusBadge value={`${formatPercent(detail.summary?.case_accuracy)} accuracy`} />
          </div>
          <div className="case-grid">
            {(detail.results || []).slice(0, 12).map((result) => (
              <article className="case-card" key={result.id}>
                <div>
                  <strong>{result.id}</strong>
                  <StatusBadge value={Boolean(result.result?.passed)} />
                </div>
                <p>{result.input}</p>
                <code>
                  {(result.result?.actual_tool_calls || [])
                    .map((call) => call.name)
                    .join(", ") || "no tool"}
                </code>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
