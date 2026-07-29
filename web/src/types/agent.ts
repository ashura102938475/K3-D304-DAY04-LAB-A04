export type Status = "idle" | "loading" | "ready" | "demo" | "error";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
};

export type ToolEvent = {
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
};

export type ToolRound = {
  round: number;
  assistant_text?: string | null;
  tool_calls?: ToolCall[];
  tool_results?: ToolEvent[];
};

export type ChatRequest = {
  message: string;
  provider: string;
  model?: string;
  version: string;
  history?: ChatMessage[];
  history_window?: number;
  max_tool_rounds?: number;
};

export type ChatResponse = {
  status: string;
  assistant_text: string;
  rounds: ToolRound[];
  tool_events: ToolEvent[];
  transcript?: {
    id: string;
    file: string;
    path: string;
  };
  artifact_version?: string;
  provider?: string;
  model?: string;
};

export type RunSummary = {
  file: string;
  path: string;
  run_id?: string;
  version?: string;
  artifact_version?: string;
  phase?: string;
  suite?: string;
  provider?: string;
  model?: string;
  generated_at?: string;
  summary?: Record<string, unknown>;
  failures?: Array<Record<string, unknown>>;
  tool_counts?: Record<string, number>;
  result_count?: number;
};

export type RunResult = {
  id: string;
  phase?: string;
  suite?: string;
  is_multiturn?: boolean;
  metadata?: Record<string, unknown>;
  input?: unknown;
  expect?: Record<string, unknown>;
  result?: Record<string, unknown>;
  tool_results?: ToolEvent[];
};

export type RunDetail = RunSummary & {
  results?: RunResult[];
};

export type VersionLogRow = {
  version?: string;
  author?: string;
  changed_artifact?: string;
  artifact_version?: string;
  prompt_hash?: string;
  tools_hash?: string;
  reason?: string;
  hypothesis?: string;
  metric_name?: string;
  metric_before?: string;
  metric_after?: string;
  run_file?: string;
};

export type ToolDeclaration = {
  name: string;
  description?: string;
  parameters?: {
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

export type Evidence = {
  source?: "api" | "mock";
  root: string;
  runs: RunSummary[];
  version_log: VersionLogRow[];
  tools: ToolDeclaration[];
  transcripts: TranscriptSummary[];
  defaults: {
    provider: string;
    version: string;
    max_tool_rounds: number;
  };
};

export type TranscriptSummary = {
  file: string;
  path: string;
  transcript_id?: string;
  version?: string;
  artifact_version?: string;
  provider?: string;
  model?: string;
  created_at?: string;
  updated_at?: string;
  turn_count?: number;
  last_user?: string | null;
  last_status?: string | null;
};

export type TranscriptTurn = {
  turn_index?: number;
  started_at?: string;
  ended_at?: string;
  user?: string;
  status?: string;
  assistant_text?: string;
  rounds?: ToolRound[];
  tool_events?: ToolEvent[];
};

export type TranscriptDetail = TranscriptSummary & {
  history_window?: number;
  max_tool_rounds?: number;
  turns?: TranscriptTurn[];
};
