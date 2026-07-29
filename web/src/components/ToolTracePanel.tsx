import { CheckCircle2, ChevronRight, Wrench } from "lucide-react";
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
    ? `${callCount} tool call(s) in the latest response`
    : rounds.length > 0
      ? "Direct answer · no tools used"
      : "No response selected";

  return (
    <section className="panel trace-panel">
      <div className="panel-heading">
        <div>
          <h2>Tool trace</h2>
          <p>{traceLabel}</p>
        </div>
        <Wrench size={20} />
      </div>

      {rounds.length === 0 && events.length === 0 ? (
        <div className="empty-state">Send a request to inspect its tool activity.</div>
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
          <code>{inlineArgs(event.args)}</code>
        </span>
        <span className={hasError ? "mini-badge bad" : isPending ? "mini-badge neutral" : "mini-badge good"}>
          {hasError ? "error" : isPending ? "pending" : "success"}
        </span>
      </summary>
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

function inlineArgs(value: unknown) {
  const text = value ? JSON.stringify(value) : "{}";
  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}
