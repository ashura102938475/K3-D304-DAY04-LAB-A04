import { Activity, CircleCheck, Loader2, Send, Settings2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { sendChat } from "../lib/api";
import type { ChatMessage, ChatResponse, Evidence } from "../types/agent";
import { MarkdownContent } from "./MarkdownContent";
import { VersionSelector } from "./VersionSelector";

type ChatPanelProps = {
  evidence: Evidence | null;
  onResult: (result: ChatResponse) => void;
};

type DisplayMessage = ChatMessage & {
  trace?: ChatResponse;
};

const starterPrompts = [
  "Latest tweet from Sam Altman?",
  "Search recent posts about GPT-5 on Twitter",
  "Read https://example.com and summarize it",
  "Send this digest to Telegram"
];

export function ChatPanel({ evidence, onResult }: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState(evidence?.defaults.provider || "nvidia");
  const [version, setVersion] = useState(evidence?.defaults.version || "v3");
  const [model, setModel] = useState("");
  const [maxRounds, setMaxRounds] = useState(evidence?.defaults.max_tool_rounds || 4);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = input.trim().length > 0 && !isSending;
  useEffect(() => {
    if (evidence?.defaults.provider) {
      setProvider(evidence.defaults.provider);
    }
  }, [evidence?.defaults.provider]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    setIsSending(true);
    setError(null);
    setInput("");
    const nextMessages: DisplayMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);

    try {
      const result = await sendChat({
        message,
        provider,
        model: model.trim() || undefined,
        version,
        history: messages.map(({ role, content }) => ({ role, content })),
        max_tool_rounds: maxRounds
      });
      const assistant: DisplayMessage = {
        role: "assistant",
        content: result.assistant_text || "(empty response)",
        trace: result
      };
      setMessages([...nextMessages, assistant]);
      onResult(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      setError(detail);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-heading">
        <div>
          <h2>Live playground</h2>
          <p>Ask the agent and inspect its tool choices.</p>
        </div>
        <Settings2 size={20} />
      </div>

      <div className="controls-grid">
        <label>
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="openrouter">openrouter</option>
            <option value="openai">openai</option>
            <option value="anthropic">anthropic</option>
            <option value="gemini">gemini</option>
            <option value="nvidia">nvidia</option>
          </select>
        </label>
        <label>
          Model override
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="provider default" />
        </label>
        <label>
          Max rounds
          <input
            min={1}
            max={8}
            type="number"
            value={maxRounds}
            onChange={(event) => setMaxRounds(Number(event.target.value))}
          />
        </label>
      </div>

      <VersionSelector rows={evidence?.version_log || []} value={version} onChange={setVersion} />

      <div className="prompt-pills">
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setInput(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="message-list" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty-state">No messages yet. Pick a sample or type a request.</div>
        ) : (
          messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role}</span>
              {message.role === "assistant" ? (
                <>
                  <MarkdownContent content={message.content} />
                  <MessageTraceSummary result={message.trace} />
                </>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          aria-label="Agent request"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a research request..."
          rows={3}
        />
        <button disabled={!canSubmit} type="submit">
          {isSending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          <span>{isSending ? "Running" : "Send"}</span>
        </button>
      </form>
    </section>
  );
}

function MessageTraceSummary({ result }: { result?: ChatResponse }) {
  if (!result) return null;

  const toolNames = result.tool_events
    .map((event) => event.tool)
    .filter((name): name is string => Boolean(name));
  const toolRounds = result.rounds.filter(
    (round) => (round.tool_calls?.length || round.tool_results?.length || 0) > 0
  ).length;

  if (toolNames.length === 0) {
    return (
      <div className="message-trace direct">
        <CircleCheck size={15} />
        <strong>Direct answer</strong>
        <span>No tool calls</span>
      </div>
    );
  }

  return (
    <div className="message-trace">
      <Activity size={15} />
      <strong>{toolNames.length} tool call(s)</strong>
      <span>
        {toolRounds} round(s) · {toolNames.join(" → ")}
      </span>
    </div>
  );
}
