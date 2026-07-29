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
  const [view, setView] = useState("chat");
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

  const activeRounds = chatResult?.rounds || [];
  const activeEvents = chatResult?.tool_events || [];
  const titleByView: Record<string, { eyebrow: string; title: string; description: string }> = {
    chat: {
      eyebrow: "Live agent",
      title: "Chat and inspect",
      description: "Ask one request, then review the exact tool calls and results used to answer it."
    },
    runs: {
      eyebrow: "Evidence",
      title: "Run results",
      description: "Compare saved eval runs, inspect failing cases, and open the trace behind a selected run."
    },
    versions: {
      eyebrow: "Prompt history",
      title: "Version timeline",
      description: "Review each prompt/tool iteration, the hypothesis behind it, and its measured effect."
    },
    tools: {
      eyebrow: "Tool interface",
      title: "Tool catalog",
      description: "See the declared tools, required arguments, and which tools are core, custom, or optional."
    }
  };
  const page = titleByView[view] || titleByView.chat;

  return (
    <AppShell
      selectedView={view}
      onViewChange={setView}
      health={status === "ready" ? "online" : "offline"}
    >
      <header className="page-header">
        <div>
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
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
          API is not reachable. Start the backend with start.sh, then refresh. Detail: {loadError}
        </div>
      )}

      {view === "chat" && (
        <div className="chat-workspace">
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
        <VersionEvidence rows={evidence?.version_log || []} />
      )}

      {view === "tools" && (
        <ToolCatalog tools={evidence?.tools || []} />
      )}
    </AppShell>
  );
}
