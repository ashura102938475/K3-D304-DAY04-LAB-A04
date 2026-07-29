import type { ChatRequest, ChatResponse, Evidence, RunDetail, TranscriptDetail } from "../types/agent";
import { mockChatResponse, mockEvidence, mockRunDetail, mockTranscriptDetail } from "./mockData";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    ...init
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // Keep the HTTP status text when the response is not JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getEvidence(): Promise<Evidence> {
  return requestJson<Evidence>("/api/evidence").catch(() => mockEvidence);
}

export function getRunDetail(filename: string): Promise<RunDetail> {
  return requestJson<RunDetail>(`/api/runs/${encodeURIComponent(filename)}`).catch(() => ({
    ...mockRunDetail,
    file: filename || mockRunDetail.file
  }));
}

export function getTranscriptDetail(filename: string): Promise<TranscriptDetail> {
  return requestJson<TranscriptDetail>(`/api/transcripts/${encodeURIComponent(filename)}`).catch(() => ({
    ...mockTranscriptDetail,
    file: filename || mockTranscriptDetail.file
  }));
}

export function sendChat(payload: ChatRequest): Promise<ChatResponse> {
  return requestJson<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(payload)
  }).catch(() => mockChatResponse(payload));
}

export function compactJson(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}
