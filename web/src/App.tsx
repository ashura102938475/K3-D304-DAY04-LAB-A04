import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ChatPanel } from "./components/ChatPanel";
import { RunEvidenceTable } from "./components/RunEvidenceTable";
import { ToolCatalog } from "./components/ToolCatalog";
import { ToolTracePanel } from "./components/ToolTracePanel";
import { VersionEvidence } from "./components/VersionEvidence";
import { getEvidence, getRunDetail } from "./lib/api";
import type { ChatResponse, Evidence, RunDetail, Status, ToolEvent, ToolRound } from "./types/agent";

export default function App() {
  const [view, setView] = useState("playground");
  const [status, setStatus] = useState<Status>("idle");
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | undefined>();
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);

  useEffect(() => {
    setStatus("loading");
    getEvidence()
      .then((data) => {
        setEvidence(data);
        setSelectedRun(data.runs[0]?.file);
        setStatus("ready");
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Could not load API data");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    getRunDetail(selectedRun)
      .then(setRunDetail)
      .catch(() => setRunDetail(null));
  }, [selectedRun]);

  const selectedRunTrace = useMemo(() => {
    const firstCaseWithTools = runDetail?.results?.find((result) => (result.tool_results || []).length > 0);
    const events: ToolEvent[] = firstCaseWithTools?.tool_results || [];
    const rounds: ToolRound[] = events.length
      ? [{ round: 1, assistant_text: null, tool_results: events }]
      : [];
    return { events, rounds };
  }, [runDetail]);

  const activeRounds = chatResult?.rounds || selectedRunTrace.rounds;
  const activeEvents = chatResult?.tool_events || selectedRunTrace.events;

  return (
    <AppShell
      selectedView={view}
      onViewChange={setView}
      health={status === "ready" ? "online" : "offline"}
    >
      <header className="page-header">
        <div>
          <p className="eyebrow">Day 04 lab</p>
          <h1>Research Agent Control Room</h1>
          <p>
            Run the agent, inspect tool calls, and compare prompt/tool versions from the lab artifacts.
          </p>
        </div>
        <div className="header-stats">
          <div>
            <span>Runs</span>
            <strong>{evidence?.runs.length ?? "--"}</strong>
          </div>
          <div>
            <span>Versions</span>
            <strong>{evidence?.version_log.length ?? "--"}</strong>
          </div>
          <div>
            <span>Tools</span>
            <strong>{evidence?.tools.length ?? "--"}</strong>
          </div>
        </div>
      </header>

      {status === "error" && (
        <div className="error-box">
          API is not reachable. Start the backend on port 8000, then refresh. Detail: {loadError}
        </div>
      )}

      {view === "playground" && (
        <div className="dashboard-grid">
          <ChatPanel evidence={evidence} onResult={setChatResult} />
          <ToolTracePanel rounds={activeRounds} events={activeEvents} />
        </div>
      )}

      {view === "runs" && (
        <div className="stack">
          <RunEvidenceTable
            runs={evidence?.runs || []}
            selectedRun={selectedRun}
            detail={runDetail}
            onSelectRun={setSelectedRun}
          />
          <ToolTracePanel rounds={selectedRunTrace.rounds} events={selectedRunTrace.events} />
        </div>
      )}

      {view === "versions" && (
        <div className="stack">
          <VersionEvidence rows={evidence?.version_log || []} />
          <ToolCatalog tools={evidence?.tools || []} />
        </div>
      )}
    </AppShell>
  );
}
