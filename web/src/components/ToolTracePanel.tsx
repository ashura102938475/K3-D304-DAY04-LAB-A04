import { CheckCircle2, ChevronRight, Database, Wrench } from "lucide-react";
import { compactJson } from "../lib/api";
import type { ToolEvent, ToolRound } from "../types/agent";

type ToolTracePanelProps = {
  rounds?: ToolRound[];
  events?: ToolEvent[];
};

export function ToolTracePanel({ rounds = [], events = [] }: ToolTracePanelProps) {
  const callCount = events.length || rounds.reduce(
    (total, round) => total + (round.tool_calls?.length || round.tool_results?.length || 0),
    0
  );
  const traceLabel = callCount > 0
    ? `${callCount} tool call(s)`
    : rounds.length > 0
      ? "Direct answer"
      : "Waiting for a response";

  return (
    <section className="panel trace-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Tool trace</h2>
          <p>{traceLabel}</p>
        </div>
        <Wrench size={20} />
      </div>

      {rounds.length === 0 && events.length === 0 ? (
        <div className="trace-empty">
          <Database size={24} />
          <strong>No trace selected</strong>
          <span>Send a chat request or choose a run with tool events.</span>
        </div>
      ) : (
        <div className="trace-list">
          {rounds.map((round, roundIndex) => {
            const roundEvents = round.tool_results || [];
            const roundCalls = round.tool_calls || [];
            const hasToolActivity = roundEvents.length > 0 || roundCalls.length > 0;
            const eventsToRender = roundEvents.length > 0
              ? roundEvents
              : roundCalls.map((call) => ({ tool: call.name, args: call.args }));

            return (
              <article className="trace-round" key={round.round}>
                <div className="trace-round-title">
                  <ChevronRight size={16} />
                  <span>Round {round.round}</span>
                  <span className="round-kind">{hasToolActivity ? "Tool execution" : "Response"}</span>
                </div>
                {!hasToolActivity ? (
                  <div className="trace-direct">
                    <CheckCircle2 size={17} />
                    <span>
                      {callCount > 0 && roundIndex === rounds.length - 1
                        ? "Final response composed from tool results."
                        : "Answered directly without invoking a tool."}
                    </span>
                  </div>
                ) : (
                  eventsToRender.map((event, index) => (
                    <ToolEventCard event={event} key={`${round.round}-${index}`} />
                  ))
                )}
              </article>
            );
          })}
          {rounds.length === 0 && events.map((event, index) => <ToolEventCard event={event} key={index} />)}
        </div>
      )}
    </section>
  );
}

function ToolEventCard({ event }: { event: ToolEvent }) {
  const isPending = event.result === undefined;
  const hasError =
    typeof event.result === "object" &&
    event.result !== null &&
    "error" in event.result;

  return (
    <details className={hasError ? "tool-card error" : "tool-card"}>
      <summary>
        <span className="tool-summary-main">
          <span className="tool-name">{event.tool || "tool"}</span>
          <span className="arg-chip-row">{argChips(event.args)}</span>
        </span>
        <span className={hasError ? "mini-badge bad" : isPending ? "mini-badge neutral" : "mini-badge good"}>
          {hasError ? "error" : isPending ? "pending" : "success"}
        </span>
      </summary>
      {!isPending && <p className="result-summary">{summarizeResult(event.result)}</p>}
      <div className="json-block">
        <label>Args</label>
        <pre>{compactJson(event.args) || "{}"}</pre>
      </div>
      {!isPending && (
        <div className="json-block">
          <label>Result</label>
          <pre>{compactJson(event.result) || "{}"}</pre>
        </div>
      )}
    </details>
  );
}

function argChips(value: unknown) {
  if (!value || typeof value !== "object") {
    return <code className="arg-chip">no args</code>;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <code className="arg-chip">no args</code>;
  }
  return entries.slice(0, 4).map(([key, item]) => (
    <code className="arg-chip" key={key}>
      {key}: {shortValue(item)}
    </code>
  ));
}

function shortValue(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > 34 ? `${text.slice(0, 31)}...` : text;
}

function summarizeResult(value: unknown) {
  if (!value || typeof value !== "object") {
    return "Tool returned a primitive result.";
  }
  const result = value as Record<string, unknown>;
  if (typeof result.error === "string") {
    return String(result.message || result.error);
  }
  if (Array.isArray(result.items)) {
    return `${result.items.length} item(s) returned. Open for raw args and result.`;
  }
  if (Array.isArray(result.results)) {
    return `${result.results.length} result(s) returned. Open for raw args and result.`;
  }
  if (typeof result.markdown === "string") {
    return "Formatted markdown returned. Open for raw args and result.";
  }
  return "Tool completed. Open for raw args and result.";
}
