import type { ChatMessage, ChatResponse, Evidence, RunDetail } from "../types/agent";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // Keep the HTTP status text when the server did not return JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getEvidence() {
  return request<Evidence>("/api/evidence");
}

export function getRunDetail(filename: string) {
  return request<RunDetail>(`/api/runs/${encodeURIComponent(filename)}`);
}

export function sendChat(input: {
  message: string;
  provider: string;
  model?: string;
  version: string;
  history: ChatMessage[];
  max_tool_rounds: number;
}) {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function formatPercent(value?: number) {
  if (typeof value !== "number") return "--";
  return `${Math.round(value * 100)}%`;
}

export function compactJson(value: unknown) {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value, null, 2);
}
