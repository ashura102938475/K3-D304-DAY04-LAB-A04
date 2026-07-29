export type Status = "idle" | "loading" | "ready" | "error";

export type Summary = {
  total_cases?: number;
  measured_cases?: number;
  provider_error_cases?: number;
  passed_cases?: number;
  case_accuracy?: number;
  tool_routing_accuracy?: number;
  argument_accuracy?: number;
  multiturn_accuracy?: number;
  failure_counts?: Record<string, number>;
  observed_mismatch_counts?: Record<string, number>;
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
  summary: Summary;
  failures: Array<{
    id?: string;
    failure_type?: string;
    failures?: unknown[];
  }>;
  tool_counts: Record<string, number>;
  result_count: number;
};

export type VersionLogRow = {
  version?: string;
  changed_artifact?: string;
  artifact_version?: string;
  reason?: string;
  hypothesis?: string;
  metric_name?: string;
  metric_before?: string;
  metric_after?: string;
  run_file?: string;
  [key: string]: string | undefined;
};

export type ToolDeclaration = {
  name: string;
  description?: string;
  parameters?: unknown;
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
  turn_count: number;
  last_user?: string;
  last_status?: string;
};

export type Evidence = {
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

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ToolEvent = {
  tool?: string;
  args?: unknown;
  result?: unknown;
};

export type ToolRound = {
  round: number;
  assistant_text?: string | null;
  tool_calls?: Array<{ name: string; args?: unknown }>;
  tool_results?: ToolEvent[];
};

export type ChatResponse = {
  status: string;
  assistant_text: string;
  rounds: ToolRound[];
  tool_events: ToolEvent[];
  artifact_version?: string;
  provider?: string;
  model?: string;
  transcript?: {
    id: string;
    file: string;
    path: string;
  };
};

export type RunDetail = {
  run_id?: string;
  version?: string;
  artifact_version?: string;
  summary?: Summary;
  results?: Array<{
    id?: string;
    input?: string;
    result?: {
      passed?: boolean;
      failures?: unknown[];
      actual_tool_calls?: Array<{ name: string; args?: unknown }>;
      actual_text?: string | null;
      failure_type?: string | null;
    };
    tool_results?: ToolEvent[];
  }>;
};
