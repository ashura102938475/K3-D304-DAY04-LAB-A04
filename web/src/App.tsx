import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ChatPanel } from "./components/ChatPanel";
import { RunEvidenceTable } from "./components/RunEvidenceTable";
import { TranscriptExplorer } from "./components/TranscriptExplorer";
import { ToolCatalog } from "./components/ToolCatalog";
import { ToolTracePanel } from "./components/ToolTracePanel";
import { VersionEvidence } from "./components/VersionEvidence";
import { getEvidence, getRunDetail, getTranscriptDetail } from "./lib/api";
import type {
  ChatResponse,
  Evidence,
  RunDetail,
  Status,
  ToolEvent,
  ToolRound,
  TranscriptDetail
} from "./types/agent";

export default function App() {
  const [view, setView] = useState("demo");
  const [status, setStatus] = useState<Status>("idle");
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | undefined>();
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<string | undefined>();
  const [transcriptDetail, setTranscriptDetail] = useState<TranscriptDetail | null>(null);

  useEffect(() => {
    setStatus("loading");
    getEvidence()
      .then((data) => {
        setEvidence(data);
        setSelectedRun(data.runs[0]?.file);
        setSelectedTranscript(data.transcripts[0]?.file);
        setStatus(data.source === "mock" ? "demo" : "ready");
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

  useEffect(() => {
    if (!selectedTranscript) return;
    getTranscriptDetail(selectedTranscript)
      .then(setTranscriptDetail)
      .catch(() => setTranscriptDetail(null));
  }, [selectedTranscript]);

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

  const counts = {
    runs: evidence?.runs.length || 0,
    transcripts: evidence?.transcripts.length || 0,
    tools: evidence?.tools.length || 0,
    versions: evidence?.version_log.length || 0
  };

  const titleByView: Record<string, { eyebrow: string; title: string; description: string }> = {
    demo: {
      eyebrow: "Live demo",
      title: "Research agent command center",
      description: "Run one prompt, watch the tool calls, and show the evidence trail without leaving the screen."
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
    },
    transcripts: {
      eyebrow: "Live history",
      title: "Transcript explorer",
      description: "Review saved chat sessions, turns, and the tool events captured during each demo."
    }
  };

  const page = titleByView[view] || titleByView.demo;

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
            <strong>{status === "loading" ? "--" : counts.runs}</strong>
          </div>
          <div>
            <span>Transcripts</span>
            <strong>{status === "loading" ? "--" : counts.transcripts}</strong>
          </div>
          <div>
            <span>Tools</span>
            <strong>{status === "loading" ? "--" : counts.tools}</strong>
          </div>
        </div>
      </header>

      {status === "error" && (
        <div className="error-box">
          API is not reachable. Start the backend with start.sh, then refresh. Detail: {loadError}
        </div>
      )}

      {status === "demo" && (
        <div className="notice-box">
          Backend is not reachable, so this preview is using frontend evaluation data. Start the FastAPI service to
          inspect real runs, transcripts, and live chat output.
        </div>
      )}

      {view === "demo" && (
        <div className="demo-page">
          <div className="demo-workspace">
            <div className="demo-main">
              <ChatPanel evidence={evidence} onResult={setChatResult} />
            </div>
            <div className="demo-side">
              <ToolTracePanel rounds={activeRounds} events={activeEvents} />
            </div>
          </div>
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

      {view === "transcripts" && (
        <TranscriptExplorer
          transcripts={evidence?.transcripts || []}
          selectedTranscript={selectedTranscript}
          detail={transcriptDetail}
          onSelectTranscript={setSelectedTranscript}
        />
      )}
    </AppShell>
  );
}
