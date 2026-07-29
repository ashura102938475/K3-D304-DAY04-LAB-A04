import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Code2,
  FileClock,
  Filter,
  MessageSquareText,
  Search,
  Sparkles,
  Terminal,
  UserRound,
  Wrench
} from "lucide-react";
import { useMemo, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { ToolTracePanel } from "./ToolTracePanel";
import type { ToolEvent, ToolRound, TranscriptDetail, TranscriptSummary } from "../types/agent";

type TranscriptExplorerProps = {
  transcripts: TranscriptSummary[];
  selectedTranscript?: string;
  detail: TranscriptDetail | null;
  onSelectTranscript: (file: string) => void;
};

export function TranscriptExplorer({
  transcripts,
  selectedTranscript,
  detail,
  onSelectTranscript
}: TranscriptExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null);

  // Extract unique providers for filter tabs
  const providers = useMemo(() => {
    const set = new Set<string>();
    transcripts.forEach((t) => {
      if (t.provider) set.add(t.provider);
    });
    return Array.from(set);
  }, [transcripts]);

  // Filtered transcripts
  const filteredTranscripts = useMemo(() => {
    return transcripts.filter((item) => {
      const matchesProvider =
        providerFilter === "all" || item.provider?.toLowerCase() === providerFilter.toLowerCase();
      const haystack = `${item.file} ${item.version || ""} ${item.provider || ""} ${item.last_user || ""}`.toLowerCase();
      const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.toLowerCase());
      return matchesProvider && matchesSearch;
    });
  }, [transcripts, providerFilter, searchQuery]);

  // Determine active turn for tool trace
  const turns = detail?.turns || [];
  const activeTurn = selectedTurnIndex !== null && turns[selectedTurnIndex]
    ? turns[selectedTurnIndex]
    : [...turns].reverse().find((t) => (t.rounds || []).length > 0 || (t.tool_events || []).length > 0) || turns[0];

  const rounds: ToolRound[] = activeTurn?.rounds || [];
  const events: ToolEvent[] = activeTurn?.tool_events || [];

  return (
    <div className="transcript-workspace">
      <section className="panel transcript-panel">
        <div className="panel-heading compact-heading">
          <div>
            <h2>Transcript explorer</h2>
            <p>{transcripts.length} saved chat session transcript(s)</p>
          </div>
          <div className="heading-badge">
            <FileClock size={18} />
            <span>{filteredTranscripts.length} shown</span>
          </div>
        </div>

        {transcripts.length === 0 ? (
          <div className="empty-state transcript-empty-hero">
            <FileClock size={36} />
            <h3>No transcripts available</h3>
            <p>Saved chat sessions and tool execution traces will appear here after running demo prompts.</p>
          </div>
        ) : (
          <div className="transcript-layout">
            {/* Left Sidebar: List & Filter */}
            <aside className="transcript-sidebar">
              <div className="transcript-search-bar">
                <div className="search-input-wrapper">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search transcripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" className="clear-search" onClick={() => setSearchQuery("")}>
                      ×
                    </button>
                  )}
                </div>

                {providers.length > 1 && (
                  <div className="provider-filter-chips">
                    <button
                      type="button"
                      className={providerFilter === "all" ? "chip active" : "chip"}
                      onClick={() => setProviderFilter("all")}
                    >
                      All
                    </button>
                    {providers.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={providerFilter === p ? "chip active" : "chip"}
                        onClick={() => setProviderFilter(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="transcript-list">
                {filteredTranscripts.length === 0 ? (
                  <div className="no-search-results">
                    <Filter size={20} />
                    <span>No transcripts match filter</span>
                  </div>
                ) : (
                  filteredTranscripts.map((item) => {
                    const isSelected = selectedTranscript === item.file;
                    return (
                      <button
                        key={item.file}
                        type="button"
                        className={`transcript-row ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          onSelectTranscript(item.file);
                          setSelectedTurnIndex(null);
                        }}
                      >
                        <div className="transcript-row-header">
                          <div className="version-pill">{item.version || "v?"}</div>
                          {item.provider && (
                            <span className="provider-tag">{item.provider}</span>
                          )}
                          <span className="turn-count-chip">
                            <MessageSquareText size={12} />
                            {item.turn_count ?? 0}
                          </span>
                        </div>

                        <div className="transcript-file-code">
                          <Code2 size={13} />
                          <span>{item.file}</span>
                        </div>

                        {item.last_user && (
                          <p className="transcript-row-snippet">
                            "{truncate(item.last_user, 80)}"
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right Panel: Detail & Conversation View */}
            <main className="transcript-detail-container">
              {detail ? (
                <div className="transcript-inspector">
                  {/* Inspector Header */}
                  <div className="inspector-header-card">
                    <div className="header-title-area">
                      <span className="eyebrow-tag">
                        <Terminal size={13} />
                        Session log
                      </span>
                      <h3>{detail.transcript_id || detail.file}</h3>
                      <div className="header-meta-tags">
                        <span className="meta-badge model">
                          <Activity size={12} />
                          {detail.model || "default-model"}
                        </span>
                        <span className="meta-badge provider">
                          <Sparkles size={12} />
                          {detail.provider || "nvidia"}
                        </span>
                        {detail.artifact_version && (
                          <span className="meta-badge artifact">
                            v:{detail.artifact_version}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Grid */}
                  <div className="transcript-metrics-grid">
                    <MetricTile label="Version" value={detail.version || "v?"} icon={Sparkles} />
                    <MetricTile label="Total turns" value={String(detail.turn_count ?? turns.length)} icon={MessageSquareText} />
                    <MetricTile label="Model" value={detail.model || "default"} icon={Bot} />
                    <MetricTile label="Updated" value={formatTime(detail.updated_at || detail.created_at)} icon={Clock} />
                  </div>

                  {/* Turns Conversation Flow */}
                  <div className="turns-section">
                    <div className="section-header">
                      <h4>
                        <MessageSquareText size={16} />
                        Conversation Turns ({turns.length})
                      </h4>
                      <p>Click a turn to view its specific tool trace details below.</p>
                    </div>

                    <div className="turn-cards-stack">
                      {turns.map((turn, index) => {
                        const isActiveForTrace = activeTurn === turn;
                        const turnToolCount = (turn.rounds || []).reduce(
                          (acc, r) => acc + (r.tool_calls?.length || r.tool_results?.length || 0),
                          0
                        ) || (turn.tool_events || []).length;

                        return (
                          <div
                            key={`${turn.turn_index || index}-${turn.started_at || ""}`}
                            className={`turn-card ${isActiveForTrace ? "active-trace-turn" : ""}`}
                            onClick={() => setSelectedTurnIndex(index)}
                          >
                            <div className="turn-card-header">
                              <div className="turn-badge">
                                <span className="turn-num">Turn {turn.turn_index || index + 1}</span>
                                <span className={`turn-status ${turn.status === "answered" ? "success" : "neutral"}`}>
                                  <CheckCircle2 size={13} />
                                  {turn.status || "completed"}
                                </span>
                              </div>
                              <div className="turn-header-right">
                                {turnToolCount > 0 && (
                                  <span className="tool-count-badge">
                                    <Wrench size={12} />
                                    {turnToolCount} tool call(s)
                                  </span>
                                )}
                                {turn.started_at && (
                                  <span className="turn-time">
                                    <Clock size={12} />
                                    {formatShortTime(turn.started_at)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* User Prompt */}
                            {turn.user && (
                              <div className="chat-bubble user-bubble">
                                <div className="bubble-avatar user-avatar">
                                  <UserRound size={14} />
                                </div>
                                <div className="bubble-content">
                                  <div className="bubble-role">User</div>
                                  <p>{turn.user}</p>
                                </div>
                              </div>
                            )}

                            {/* Assistant Response */}
                            <div className="chat-bubble assistant-bubble">
                              <div className="bubble-avatar bot-avatar">
                                <Bot size={14} />
                              </div>
                              <div className="bubble-content">
                                <div className="bubble-role">
                                  <span>Assistant</span>
                                  <span className="model-subtag">{detail.model || detail.provider}</span>
                                </div>
                                <MarkdownContent content={turn.assistant_text || "(Empty response)"} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tool Trace Panel Section */}
                  <div className="transcript-trace-wrapper">
                    <div className="trace-section-header">
                      <h4>
                        <Wrench size={16} />
                        Tool Trace — Turn {activeTurn?.turn_index || 1}
                      </h4>
                    </div>
                    <ToolTracePanel rounds={rounds} events={events} embedded />
                  </div>
                </div>
              ) : (
                <div className="empty-state transcript-empty-detail">
                  <MessageSquareText size={32} />
                  <h4>Select a transcript</h4>
                  <p>Choose any session from the left sidebar to inspect its turn history and tool traces.</p>
                </div>
              )}
            </main>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="transcript-metric-tile">
      <div className="tile-icon">
        <Icon size={16} />
      </div>
      <div className="tile-info">
        <span className="tile-label">{label}</span>
        <strong className="tile-value" title={value}>{value}</strong>
      </div>
    </div>
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
