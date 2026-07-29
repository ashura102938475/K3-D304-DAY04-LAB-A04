<<<<<<< HEAD
import { CheckCircle2, ChevronRight, Database, Wrench } from "lucide-react";
=======
import { CheckCircle2, ChevronDown, Database, FileCode2, Wrench, XCircle } from "lucide-react";
>>>>>>> main
import { compactJson } from "../lib/api";
import type { ToolEvent, ToolRound } from "../types/agent";

type ToolTracePanelProps = {
  rounds?: ToolRound[];
  events?: ToolEvent[];
  embedded?: boolean;
};

export function ToolTracePanel({ rounds = [], events = [], embedded = false }: ToolTracePanelProps) {
  const callCount = events.length || rounds.reduce(
    (total, round) => total + (round.tool_calls?.length || round.tool_results?.length || 0),
    0
  );
  const errorCount = collectEvents(rounds, events).filter(hasToolError).length;
  const traceLabel = callCount > 0
<<<<<<< HEAD
    ? `${callCount} tool call(s)`
=======
    ? `${callCount} call(s), ${errorCount} error(s)`
>>>>>>> main
    : rounds.length > 0
      ? "Direct answer"
      : "Waiting";

  return (
    <section className={embedded ? "trace-panel embedded-trace-panel" : "panel trace-panel"}>
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
          <span>Send a chat request or choose a run/transcript with tool events.</span>
        </div>
      ) : (
        <div className="trace-list">
<<<<<<< HEAD
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
=======
          {rounds.map((round) => <TraceRound round={round} callCount={callCount} key={round.round} />)}
>>>>>>> main
          {rounds.length === 0 && events.map((event, index) => <ToolEventCard event={event} key={index} />)}
        </div>
      )}
    </section>
  );
}

function TraceRound({ round, callCount }: { round: ToolRound; callCount: number }) {
  const roundEvents = round.tool_results || [];
  const roundCalls = round.tool_calls || [];
  const hasToolActivity = roundEvents.length > 0 || roundCalls.length > 0;
  const eventsToRender = roundEvents.length > 0
    ? roundEvents
    : roundCalls.map((call) => ({ tool: call.name, args: call.args }));

  return (
    <article className="trace-round">
      <div className="trace-round-title">
        <span className="round-number">Round {round.round}</span>
        <span className="round-kind">{hasToolActivity ? "Tool execution" : "Assistant response"}</span>
      </div>

      {!hasToolActivity ? (
        <div className="trace-direct">
          <CheckCircle2 size={17} />
          <span>
            {callCount > 0 ? "Final answer composed from tool results." : "Answered directly without a tool call."}
          </span>
        </div>
      ) : (
        eventsToRender.map((event, index) => (
          <ToolEventCard event={event} key={`${round.round}-${index}`} />
        ))
      )}
    </article>
  );
}

function ToolEventCard({ event }: { event: ToolEvent }) {
  const isPending = event.result === undefined;
  const hasError = hasToolError(event);

  return (
    <details className={hasError ? "tool-card error" : "tool-card"} open>
      <summary>
        <span className="tool-summary-main">
<<<<<<< HEAD
          <span className="tool-name">{event.tool || "tool"}</span>
          <span className="arg-chip-row">{argChips(event.args)}</span>
=======
          <span className="tool-icon"><FileCode2 size={15} /></span>
          <span>
            <strong className="tool-name">{event.tool || "tool"}</strong>
            <span className="arg-chip-row">{argChips(event.args)}</span>
          </span>
>>>>>>> main
        </span>
        <span className={hasError ? "mini-badge bad" : isPending ? "mini-badge neutral" : "mini-badge good"}>
          {hasError ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
          {hasError ? "error" : isPending ? "pending" : "success"}
        </span>
        <ChevronDown className="summary-chevron" size={15} />
      </summary>
      {!isPending && <p className="result-summary">{summarizeResult(event.result)}</p>}
<<<<<<< HEAD
      <div className="json-block">
        <label>Args</label>
        <pre>{compactJson(event.args) || "{}"}</pre>
      </div>
      {!isPending && (
=======
      <div className="json-grid">
>>>>>>> main
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
      </div>
    </details>
  );
}

<<<<<<< HEAD
=======
function collectEvents(rounds: ToolRound[], events: ToolEvent[]) {
  if (events.length > 0) return events;
  return rounds.flatMap((round) => round.tool_results || []);
}

function hasToolError(event: ToolEvent) {
  return typeof event.result === "object" && event.result !== null && "error" in event.result;
}

>>>>>>> main
function argChips(value: unknown) {
  if (!value || typeof value !== "object") {
    return <code className="arg-chip">no args</code>;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <code className="arg-chip">no args</code>;
  }
  return entries.slice(0, 3).map(([key, item]) => (
    <code className="arg-chip" key={key}>
      {key}: {shortValue(item)}
    </code>
  ));
}

function shortValue(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > 26 ? `${text.slice(0, 23)}...` : text;
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
    return `${result.items.length} item(s) returned. Expand for raw args and result.`;
  }
  if (Array.isArray(result.results)) {
    return `${result.results.length} result(s) returned. Expand for raw args and result.`;
  }
  if (typeof result.markdown === "string") {
    return "Formatted markdown returned. Expand for raw args and result.";
  }
<<<<<<< HEAD
  return "Tool completed. Open for raw args and result.";
=======
  return "Tool completed. Expand for raw args and result.";
>>>>>>> main
}
