import { ChevronRight, Wrench } from "lucide-react";
import { compactJson } from "../lib/api";
import type { ToolEvent, ToolRound } from "../types/agent";

type ToolTracePanelProps = {
  rounds?: ToolRound[];
  events?: ToolEvent[];
};

export function ToolTracePanel({ rounds = [], events = [] }: ToolTracePanelProps) {
  return (
    <section className="panel trace-panel">
      <div className="panel-heading">
        <div>
          <h2>Tool trace</h2>
          <p>{events.length} event(s) from the latest response</p>
        </div>
        <Wrench size={20} />
      </div>

      {rounds.length === 0 && events.length === 0 ? (
        <div className="empty-state">Run a prompt or select a run to inspect tool activity.</div>
      ) : (
        <div className="trace-list">
          {rounds.map((round) => (
            <article className="trace-round" key={round.round}>
              <div className="trace-round-title">
                <ChevronRight size={16} />
                <span>Round {round.round}</span>
              </div>
              {(round.tool_results || round.tool_calls || []).length === 0 ? (
                <p className="trace-text">{round.assistant_text || "No tool call. Agent answered directly."}</p>
              ) : (
                (round.tool_results || []).map((event, index) => (
                  <ToolEventCard event={event} key={`${round.round}-${index}`} />
                ))
              )}
            </article>
          ))}
          {rounds.length === 0 && events.map((event, index) => <ToolEventCard event={event} key={index} />)}
        </div>
      )}
    </section>
  );
}

function ToolEventCard({ event }: { event: ToolEvent }) {
  const hasError =
    typeof event.result === "object" &&
    event.result !== null &&
    "error" in event.result;

  return (
    <details className={hasError ? "tool-card error" : "tool-card"} open>
      <summary>
        <span className="tool-name">{event.tool || "tool"}</span>
        <span className={hasError ? "mini-badge bad" : "mini-badge good"}>{hasError ? "error" : "result"}</span>
      </summary>
      <div className="json-block">
        <label>Args</label>
        <pre>{compactJson(event.args) || "{}"}</pre>
      </div>
      <div className="json-block">
        <label>Result</label>
        <pre>{compactJson(event.result) || "{}"}</pre>
      </div>
    </details>
  );
}
