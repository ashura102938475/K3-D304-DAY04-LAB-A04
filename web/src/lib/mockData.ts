import type { ChatRequest, ChatResponse, Evidence, RunDetail, TranscriptDetail } from "../types/agent";

export const mockRunDetail: RunDetail = {
  file: "demo_v0_B_base_nvidia.json",
  path: "runs/demo_v0_B_base_nvidia.json",
  run_id: "demo_v0_B_base_nvidia",
  version: "v0",
  artifact_version: "v0+pdemo00000001+tdemo00000001",
  phase: "B",
  suite: "base",
  provider: "nvidia",
  model: "demo-model",
  generated_at: "2026-07-29T15:40:00",
  summary: {
    total_cases: 10,
    measured_cases: 10,
    provider_error_cases: 0,
    passed_cases: 8,
    case_accuracy: 0.8,
    tool_routing_accuracy: 0.9,
    argument_accuracy: 0.8
  },
  failures: [
    {
      id: "DEMO_wrong_boundary",
      failure_type: "wrong_boundary",
      failures: ["send tool should require explicit confirmation"]
    }
  ],
  tool_counts: {
    lookup: 4,
    fetch: 2,
    format: 2,
    clarify: 1
  },
  result_count: 10,
  results: [
    {
      id: "DEMO_news_digest",
      phase: "B",
      suite: "base",
      metadata: { what_it_tests: "Routes fresh news requests through lookup and format." },
      input: "Search recent AI news from this week and give me a concise digest with sources.",
      expect: { tool_calls: [{ name: "lookup" }, { name: "format" }] },
      result: {
        passed: true,
        routing_correct: true,
        args_correct: true,
        observed_mismatch: null
      },
      tool_results: [
        {
          tool: "lookup",
          args: { query: "recent AI news this week", topic: "news", timeframe: "week", max_results: 5 },
          result: {
            results: [
              { title: "AI policy update", source: "Demo News", url: "https://example.com/ai-policy" },
              { title: "Agent tooling benchmark", source: "Demo Lab", url: "https://example.com/agent-tools" }
            ]
          }
        },
        {
          tool: "format",
          args: { template: "sections", headline: "AI news digest" },
          result: { markdown: "### AI news digest\n- AI policy update\n- Agent tooling benchmark" }
        }
      ]
    },
    {
      id: "DEMO_send_boundary",
      phase: "B",
      suite: "base",
      metadata: { what_it_tests: "Does not send externally without confirmation." },
      input: "Send this digest to Telegram.",
      expect: { tool_calls: [{ name: "clarify" }] },
      result: {
        passed: false,
        routing_correct: false,
        args_correct: false,
        observed_mismatch: "wrong_tool",
        failure_type: "wrong_boundary",
        failures: ["expected clarify before send"]
      },
      tool_results: [
        {
          tool: "send",
          args: { text: "AI news digest", confirmed: false },
          result: { error: "confirmation_required", message: "External send requires explicit confirmation." }
        }
      ]
    }
  ]
};

export const mockTranscriptDetail: TranscriptDetail = {
  file: "demo_v0_nvidia.transcript.json",
  path: "transcripts/demo_v0_nvidia.transcript.json",
  transcript_id: "demo_v0_nvidia",
  version: "v0",
  artifact_version: "v0+pdemo00000001+tdemo00000001",
  provider: "nvidia",
  model: "demo-model",
  created_at: "2026-07-29T15:45:00",
  updated_at: "2026-07-29T15:45:20",
  turn_count: 1,
  last_user: "Search recent AI news from this week and give me a concise digest with sources.",
  last_status: "answered",
  history_window: 5,
  max_tool_rounds: 4,
  turns: [
    {
      turn_index: 1,
      started_at: "2026-07-29T15:45:00",
      ended_at: "2026-07-29T15:45:20",
      user: "Search recent AI news from this week and give me a concise digest with sources.",
      status: "answered",
      assistant_text: "Here is a concise demo digest based on two sourced items.",
      rounds: [
        {
          round: 1,
          assistant_text: "I will search for recent news and format the digest.",
          tool_calls: [
            { name: "lookup", args: { query: "recent AI news this week", topic: "news", timeframe: "week" } }
          ],
          tool_results: [
            {
              tool: "lookup",
              args: { query: "recent AI news this week", topic: "news", timeframe: "week" },
              result: { results: [{ title: "AI policy update", url: "https://example.com/ai-policy" }] }
            }
          ]
        },
        {
          round: 2,
          assistant_text: "Final answer composed from tool results.",
          tool_results: []
        }
      ],
      tool_events: [
        {
          tool: "lookup",
          args: { query: "recent AI news this week", topic: "news", timeframe: "week" },
          result: { results: [{ title: "AI policy update", url: "https://example.com/ai-policy" }] }
        }
      ]
    }
  ]
};

export const mockEvidence: Evidence = {
  source: "mock",
  root: "demo://offline-evaluation",
  runs: [
    {
      file: mockRunDetail.file,
      path: mockRunDetail.path,
      run_id: mockRunDetail.run_id,
      version: mockRunDetail.version,
      artifact_version: mockRunDetail.artifact_version,
      phase: mockRunDetail.phase,
      suite: mockRunDetail.suite,
      provider: mockRunDetail.provider,
      model: mockRunDetail.model,
      generated_at: mockRunDetail.generated_at,
      summary: mockRunDetail.summary,
      failures: mockRunDetail.failures,
      tool_counts: mockRunDetail.tool_counts,
      result_count: mockRunDetail.result_count
    }
  ],
  version_log: [
    {
      version: "v0",
      author: "demo",
      changed_artifact: "baseline",
      artifact_version: "v0+pdemo+tbase",
      reason: "Initial baseline behavior.",
      hypothesis: "Baseline captures routing and boundary failures.",
      metric_name: "case_accuracy",
      metric_before: "",
      metric_after: "0.55",
      run_file: "demo only"
    },
    {
      version: "v0",
      author: "demo",
      changed_artifact: "system_prompt.md + tools.yaml",
      artifact_version: "v0+pdemo00000001+tdemo00000001",
      reason: "Clarify tool boundaries and improve digest formatting.",
      hypothesis: "Explicit routing rules reduce wrong-tool and send-boundary failures.",
      metric_name: "case_accuracy",
      metric_before: "0.55",
      metric_after: "0.80",
      run_file: "demo_v0_B_base_nvidia.json"
    }
  ],
  tools: [
    {
      name: "clarify",
      description: "Ask the user for missing information or confirmation.",
      parameters: { required: ["question"], properties: { question: { type: "string" }, response_type: { type: "string" } } }
    },
    {
      name: "lookup",
      description: "Search the web for general or recent news information.",
      parameters: { required: ["query"], properties: { query: { type: "string" }, topic: { type: "string" }, timeframe: { type: "string" } } }
    },
    {
      name: "fetch",
      description: "Read and extract useful content from a URL.",
      parameters: { required: ["url"], properties: { url: { type: "string" } } }
    },
    {
      name: "format",
      description: "Turn collected items into a clean digest.",
      parameters: { required: ["items", "template"], properties: { items: { type: "array" }, template: { type: "string" } } }
    },
    {
      name: "send",
      description: "Send a confirmed text payload to an external channel.",
      parameters: { required: ["text"], properties: { text: { type: "string" }, confirmed: { type: "boolean" } } }
    }
  ],
  transcripts: [
    {
      file: mockTranscriptDetail.file,
      path: mockTranscriptDetail.path,
      transcript_id: mockTranscriptDetail.transcript_id,
      version: mockTranscriptDetail.version,
      artifact_version: mockTranscriptDetail.artifact_version,
      provider: mockTranscriptDetail.provider,
      model: mockTranscriptDetail.model,
      created_at: mockTranscriptDetail.created_at,
      updated_at: mockTranscriptDetail.updated_at,
      turn_count: mockTranscriptDetail.turn_count,
      last_user: mockTranscriptDetail.last_user,
      last_status: mockTranscriptDetail.last_status
    }
  ],
  defaults: {
    provider: "nvidia",
    version: "v0",
    max_tool_rounds: 4
  }
};

export function mockChatResponse(payload: ChatRequest): ChatResponse {
  const message = payload.message || "demo request";
  return {
    status: "answered",
    assistant_text: `Demo response for: ${message}\n\nThe frontend is using evaluation data because the backend is not reachable.`,
    provider: "demo",
    model: "offline-evaluation",
    artifact_version: `${payload.version || "v0"}+pdemo00000001+tdemo00000001`,
    rounds: [
      {
        round: 1,
        assistant_text: "I will call lookup and then format the results.",
        tool_calls: [
          { name: "lookup", args: { query: message, topic: "news", timeframe: "week", max_results: 3 } }
        ],
        tool_results: [
          {
            tool: "lookup",
            args: { query: message, topic: "news", timeframe: "week", max_results: 3 },
            result: {
              results: [
                { title: "Demo result one", url: "https://example.com/one", source: "Demo Source" },
                { title: "Demo result two", url: "https://example.com/two", source: "Demo Source" }
              ]
            }
          }
        ]
      },
      {
        round: 2,
        assistant_text: "Final answer composed from tool results.",
        tool_results: []
      }
    ],
    tool_events: [
      {
        tool: "lookup",
        args: { query: message, topic: "news", timeframe: "week", max_results: 3 },
        result: {
          results: [
            { title: "Demo result one", url: "https://example.com/one", source: "Demo Source" },
            { title: "Demo result two", url: "https://example.com/two", source: "Demo Source" }
          ]
        }
      }
    ],
    transcript: {
      id: "demo_transcript",
      file: "demo_v0_nvidia.transcript.json",
      path: "transcripts/demo_v0_nvidia.transcript.json"
    }
  };
}
