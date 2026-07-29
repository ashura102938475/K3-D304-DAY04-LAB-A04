<<<<<<< HEAD
import { AlertTriangle, FileJson } from "lucide-react";
=======
import { AlertTriangle, CheckCircle2, FileJson, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
>>>>>>> main
import type { RunDetail, RunResult, RunSummary } from "../types/agent";

type RunEvidenceTableProps = {
  runs: RunSummary[];
  selectedRun?: string;
  detail: RunDetail | null;
  onSelectRun: (file: string) => void;
};

export function RunEvidenceTable({ runs, selectedRun, detail, onSelectRun }: RunEvidenceTableProps) {
  const [caseFilter, setCaseFilter] = useState("all");
  const [query, setQuery] = useState("");
  const failedCases = (detail?.results || []).filter((item) => !item.result?.passed);
  const filteredCases = useMemo(() => {
    return (detail?.results || []).filter((item) => {
      const passed = Boolean(item.result?.passed);
      const matchesState =
        caseFilter === "all" ||
        (caseFilter === "failed" && !passed) ||
        (caseFilter === "passed" && passed);
      const haystack = `${item.id} ${item.result?.observed_mismatch || ""} ${item.result?.failure_type || ""}`.toLowerCase();
      return matchesState && haystack.includes(query.toLowerCase());
    });
  }, [caseFilter, detail?.results, query]);

  return (
    <section className="panel run-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Run evidence</h2>
          <p>{runs.length} saved run file(s)</p>
        </div>
        <FileJson size={20} />
      </div>

      {runs.length === 0 ? (
        <div className="empty-state">No saved runs found in starter_v0/runs.</div>
      ) : (
        <div className="run-layout">
          <div className="run-list">
            {runs.map((run) => (
              <button
                className={selectedRun === run.file ? "run-row selected" : "run-row"}
                key={run.file}
                type="button"
                onClick={() => onSelectRun(run.file)}
              >
                <span className="run-row-main">
                  <strong>{run.version || "v?"}</strong>
                  <small>{run.provider || "-"} / {run.suite || "-"}</small>
                </span>
                <span className={Number(run.summary?.provider_error_cases || 0) > 0 ? "score bad" : "score"}>
                  {formatMetric(run.summary?.case_accuracy)}
                </span>
                <code>{run.file}</code>
              </button>
            ))}
          </div>

          <div className="run-inspector">
            {detail ? (
              <>
                <div className="run-detail-header">
                  <div>
                    <h3>{detail.run_id || detail.file}</h3>
                    <p>{detail.artifact_version || "No artifact version"}</p>
                  </div>
                  <span className={detail.summary?.provider_error_cases ? "status-badge bad" : "status-badge good"}>
                    {detail.summary?.provider_error_cases ? "provider errors" : "measured"}
                  </span>
                </div>

                <div className="metric-grid">
                  <Metric label="Cases" value={`${detail.summary?.passed_cases ?? "-"} / ${detail.summary?.total_cases ?? "-"}`} />
                  <Metric label="Accuracy" value={formatMetric(detail.summary?.case_accuracy)} />
                  <Metric label="Routing" value={formatMetric(detail.summary?.tool_routing_accuracy)} />
                  <Metric label="Arguments" value={formatMetric(detail.summary?.argument_accuracy)} />
                </div>

                <div className="inspector-toolbar">
                  <div className="section-title">
                    <AlertTriangle size={17} />
                    <span>{failedCases.length} failing case(s)</span>
                  </div>
                  <div className="case-controls">
                    <label className="search-box">
                      <Search size={15} />
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cases" />
                    </label>
                    <label className="select-box">
                      <Filter size={15} />
                      <select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)}>
                        <option value="all">All cases</option>
                        <option value="failed">Failed</option>
                        <option value="passed">Passed</option>
                      </select>
                    </label>
                  </div>
                </div>

                {filteredCases.length === 0 ? (
                  <div className="trace-direct">No cases match this filter.</div>
                ) : (
                  <div className="case-grid">
                    {filteredCases.map((item) => <CaseCard item={item} key={item.id} />)}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">Select a run to inspect details.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CaseCard({ item }: { item: RunResult }) {
  const passed = Boolean(item.result?.passed);
  const failures = item.result?.failures;
  const failureText = Array.isArray(failures) ? failures.join("; ") : String(failures || "No failure detail");

  return (
    <article className={passed ? "case-card passed" : "case-card"}>
      <div>
        <strong>{item.id}</strong>
        <span className={passed ? "status-badge good" : "status-badge bad"}>
          {passed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {passed ? "PASS" : "FAIL"}
        </span>
      </div>
      <p>{String(item.metadata?.what_it_tests || "No description")}</p>
      <code>{String(item.result?.observed_mismatch || item.result?.failure_type || "ok")}</code>
      {!passed && <small>{failureText}</small>}
    </article>
  );
}

function formatMetric(value: unknown) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}
