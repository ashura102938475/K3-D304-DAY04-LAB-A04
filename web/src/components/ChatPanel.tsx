import {
  Activity,
  CircleCheck,
  Loader2,
  Newspaper,
  Radio,
  Search,
  Send,
  Settings2,
  Sparkles
} from "lucide-react";
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
  {
    label: "Latest post",
    icon: Radio,
    prompt: "Find the latest public post from Sam Altman and summarize the main point."
  },
  {
    label: "AI news",
    icon: Newspaper,
    prompt: "Search recent AI news from this week and give me a concise digest with sources."
  },
  {
    label: "Paper search",
    icon: Search,
    prompt: "Find recent papers about tool calling agents and summarize the top 3."
  },
  {
    label: "URL summary",
    icon: Sparkles,
    prompt: "Read https://example.com and summarize what is useful for a research agent demo."
  }
];

export function ChatPanel({ evidence, onResult }: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState(evidence?.defaults.provider || "nvidia");
  const [version, setVersion] = useState(evidence?.defaults.version || "v0");
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

  useEffect(() => {
    if (evidence?.defaults.version) {
      setVersion(evidence.defaults.version);
    }
  }, [evidence?.defaults.version]);

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
      <div className="panel-heading chat-heading">
        <div>
          <h2>Demo request</h2>
          <p>Send one focused prompt and narrate the exact tool path from the trace.</p>
        </div>
        <div className={isSending ? "run-state running" : "run-state"}>
          {isSending ? <Loader2 className="spin" size={16} /> : <CircleCheck size={16} />}
          <span>{isSending ? "Running" : "Ready"}</span>
        </div>
      </div>

      <div className="demo-toolbar">
        <div className="control-strip">
          <label>
            <span>Provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="nvidia">nvidia</option>
              <option value="openrouter">openrouter</option>
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
              <option value="gemini">gemini</option>
            </select>
          </label>
          <label>
            <span>Model</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="provider default" />
          </label>
          <label className="round-control">
            <span>Rounds</span>
            <input
              min={1}
              max={8}
              type="number"
              value={maxRounds}
              onChange={(event) => setMaxRounds(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="version-control">
          <span>
            <Settings2 size={15} />
            Version label
          </span>
          <VersionSelector rows={evidence?.version_log || []} value={version} onChange={setVersion} />
        </div>
      </div>

      <div className="sample-row">
        <div className="sample-label">
          <Sparkles size={15} />
          <span>Demo prompts</span>
        </div>
        {starterPrompts.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => setInput(item.prompt)}>
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="message-list" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <Sparkles size={24} />
            <strong>Choose a scenario, then run the agent.</strong>
            <span>The response appears here. Tool calls, arguments, and raw results stay visible on the right.</span>
          </div>
        ) : (
          messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <span className="message-role">{message.role}</span>
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
          placeholder="Ask for news, tweets, URL summaries, papers, policies, or GitHub repositories..."
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
        {toolRounds} round(s) / {toolNames.join(" -> ")}
      </span>
    </div>
  );
}
