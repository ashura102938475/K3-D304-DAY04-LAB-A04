import { Bot, Clock3, FileClock, MessageSquareText, UserRound } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { ToolTracePanel } from "./ToolTracePanel";
import type { TranscriptDetail, TranscriptSummary, ToolEvent, ToolRound } from "../types/agent";

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
  const selectedTurn = [...(detail?.turns || [])].reverse().find((turn) => {
    return (turn.rounds || []).length > 0 || (turn.tool_events || []).length > 0;
  }) || detail?.turns?.[0];
  const rounds: ToolRound[] = selectedTurn?.rounds || [];
  const events: ToolEvent[] = selectedTurn?.tool_events || [];

  return (
    <div className="transcript-workspace">
      <section className="panel transcript-panel">
        <div className="panel-heading compact-heading">
          <div>
            <h2>Transcript explorer</h2>
            <p>{transcripts.length} saved transcript(s)</p>
          </div>
          <FileClock size={20} />
        </div>

        {transcripts.length === 0 ? (
          <div className="empty-state">No transcripts found in starter_v0/transcripts.</div>
        ) : (
          <div className="transcript-layout">
            <div className="transcript-list">
              {transcripts.map((transcript) => (
                <button
                  className={selectedTranscript === transcript.file ? "transcript-row selected" : "transcript-row"}
                  key={transcript.file}
                  type="button"
                  onClick={() => onSelectTranscript(transcript.file)}
                >
                  <div className="transcript-row-top">
                    <strong>{transcript.version || "v?"}</strong>
                    <span className="status-badge neutral">{transcript.provider || "provider"}</span>
                  </div>
                  <span className="transcript-row-meta">
                    <MessageSquareText size={14} />
                    {transcript.turn_count ?? 0} turn(s)
                  </span>
                  <code>{transcript.file}</code>
                  <small>{truncate(transcript.last_user || "No user message", 92)}</small>
                </button>
              ))}
            </div>

            <div className="transcript-detail">
              {detail ? (
                <>
                  <div className="run-detail-header">
                    <div>
                      <h3>{detail.transcript_id || detail.file}</h3>
                      <p>{detail.artifact_version || "No artifact version"}</p>
                    </div>
                    <span className="status-badge neutral">{detail.provider || "provider"}</span>
                  </div>

                  <div className="transcript-summary-grid">
                    <SummaryItem label="Version" value={detail.version || "v?"} />
                    <SummaryItem label="Turns" value={String(detail.turn_count ?? detail.turns?.length ?? 0)} />
                    <SummaryItem label="Model" value={detail.model || "default"} />
                    <SummaryItem label="Updated" value={formatTime(detail.updated_at || detail.created_at)} />
                  </div>

                  <div className="turn-list">
                    {(detail.turns || []).map((turn, index) => (
                      <article className="turn-card" key={`${turn.turn_index || index}-${turn.started_at || ""}`}>
                        <div className="turn-card-top">
                          <span>
                            <MessageSquareText size={15} />
                            Turn {turn.turn_index || index + 1}
                          </span>
                          <small>
                            <Clock3 size={13} />
                            {turn.status || "unknown"}
                          </small>
                        </div>
                        <div className="transcript-message-block user-block">
                          <span className="message-role">
                            <UserRound size={13} />
                            User
                          </span>
                          <p>{turn.user || ""}</p>
                        </div>
                        <div className="transcript-message-block assistant-block">
                          <span className="message-role">
                            <Bot size={13} />
                            Assistant
                          </span>
                          <MarkdownContent content={turn.assistant_text || "(empty response)"} />
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="transcript-trace-section">
                    <ToolTracePanel rounds={rounds} events={events} embedded />
                  </div>
                </>
              ) : (
                <div className="empty-state">Select a transcript to inspect turns.</div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="transcript-summary-item">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
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
  return date.toLocaleString();
}
