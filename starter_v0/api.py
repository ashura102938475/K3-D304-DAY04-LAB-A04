from __future__ import annotations

import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from env_loader import load_lab_env  # noqa: E402

load_lab_env(ROOT)

from chat import (  # noqa: E402
    now_iso,
    run_model_tool_loop,
    safe_slug,
    trim_history,
    write_transcript,
)
from providers import make_provider  # noqa: E402
from tools import load_tool_declarations, to_openai_tools  # noqa: E402
from versioning import artifact_version_dict, build_artifact_version  # noqa: E402


ARTIFACTS_DIR = ROOT / "artifacts"
RUNS_DIR = ROOT / "runs"
TRANSCRIPTS_DIR = ROOT / "transcripts"
SAMPLE_TRANSCRIPTS_DIR = ROOT / "samples" / "transcripts"


app = FastAPI(title="Research Agent UI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    provider: Literal["openrouter", "openai", "anthropic", "gemini", "nvidia", "nim"] = "nvidia"
    model: str | None = None
    version: str = "v0"
    history: list[ChatMessage] = Field(default_factory=list)
    history_window: int = 5
    max_tool_rounds: int = 4


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read {path.name}: {exc}") from exc


def public_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def safe_artifact_file(filename: str, directory: Path) -> Path:
    if "/" in filename or "\\" in filename or filename in {"", ".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid file name")
    path = directory / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return path


def summarize_run(path: Path) -> dict[str, Any]:
    data = read_json(path)
    summary = data.get("summary") or {}
    results = data.get("results") or []
    failures = [
        {
            "id": result.get("id"),
            "failure_type": (result.get("result") or {}).get("failure_type")
            or (result.get("result") or {}).get("case_failure_type"),
            "failures": (result.get("result") or {}).get("failures") or [],
        }
        for result in results
        if not (result.get("result") or {}).get("passed")
    ]
    tool_counts: dict[str, int] = {}
    for result in results:
        for event in result.get("tool_results") or []:
            tool = event.get("tool") or "unknown"
            tool_counts[tool] = tool_counts.get(tool, 0) + 1

    return {
        "file": path.name,
        "path": public_path(path),
        "run_id": data.get("run_id"),
        "version": data.get("version"),
        "artifact_version": data.get("artifact_version"),
        "phase": data.get("phase"),
        "suite": data.get("suite"),
        "provider": data.get("provider"),
        "model": data.get("model"),
        "generated_at": data.get("generated_at"),
        "summary": summary,
        "failures": failures,
        "tool_counts": tool_counts,
        "result_count": len(results),
    }


def read_version_log() -> list[dict[str, str]]:
    path = ARTIFACTS_DIR / "version_log.csv"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def transcript_summaries() -> list[dict[str, Any]]:
    files = list(TRANSCRIPTS_DIR.glob("*.transcript.json")) + list(SAMPLE_TRANSCRIPTS_DIR.glob("*.transcript.json"))
    summaries: list[dict[str, Any]] = []
    for path in sorted(files, key=lambda item: item.stat().st_mtime, reverse=True):
        data = read_json(path)
        turns = data.get("turns") or []
        summaries.append(
            {
                "file": path.name,
                "path": public_path(path),
                "transcript_id": data.get("transcript_id"),
                "version": data.get("version"),
                "artifact_version": data.get("artifact_version"),
                "provider": data.get("provider"),
                "model": data.get("model"),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "turn_count": len(turns),
                "last_user": (turns[-1] or {}).get("user") if turns else None,
                "last_status": (turns[-1] or {}).get("status") if turns else None,
            }
        )
    return summaries


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": now_iso()}


@app.get("/api/evidence")
def evidence() -> dict[str, Any]:
    run_files = sorted(RUNS_DIR.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    tool_declarations = load_tool_declarations(ARTIFACTS_DIR / "tools.yaml")
    return {
        "root": str(ROOT),
        "runs": [summarize_run(path) for path in run_files],
        "version_log": read_version_log(),
        "tools": tool_declarations,
        "transcripts": transcript_summaries(),
        "defaults": {
            "provider": "nvidia",
            "version": "v0",
            "max_tool_rounds": 4,
        },
    }


@app.get("/api/runs/{filename}")
def run_detail(filename: str) -> dict[str, Any]:
    return read_json(safe_artifact_file(filename, RUNS_DIR))


@app.get("/api/transcripts/{filename}")
def transcript_detail(filename: str) -> dict[str, Any]:
    for directory in [TRANSCRIPTS_DIR, SAMPLE_TRANSCRIPTS_DIR]:
        path = directory / filename
        if path.exists() and path.is_file():
            return read_json(path)
    raise HTTPException(status_code=404, detail="Transcript not found")


@app.post("/api/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    system_prompt_path = ARTIFACTS_DIR / "system_prompt.md"
    tools_path = ARTIFACTS_DIR / "tools.yaml"
    try:
        system_prompt = system_prompt_path.read_text(encoding="utf-8")
        tool_declarations = load_tool_declarations(tools_path)
        openai_tools = to_openai_tools(tool_declarations)
        provider = make_provider(request.provider)
        selected_model = request.model or getattr(provider, "default_model", None)
        artifact_version = build_artifact_version(request.version, system_prompt_path, tools_path)
        messages = [
            {"role": "system", "content": system_prompt},
            *trim_history([message.model_dump() for message in request.history], request.history_window),
            {"role": "user", "content": request.message},
        ]
        result = run_model_tool_loop(
            provider=provider,
            messages=messages,
            tools=openai_tools,
            model=request.model,
            max_tool_rounds=request.max_tool_rounds,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc

    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S%f")
    transcript_id = "_".join([safe_slug(request.version), safe_slug(request.provider), timestamp])
    transcript_path = TRANSCRIPTS_DIR / f"{transcript_id}.transcript.json"
    transcript = {
        "transcript_id": transcript_id,
        **artifact_version_dict(artifact_version),
        "provider": request.provider,
        "model": selected_model,
        "system_prompt": str(system_prompt_path),
        "tools": str(tools_path),
        "history_window": request.history_window,
        "max_tool_rounds": request.max_tool_rounds,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "turns": [
            {
                "turn_index": 1,
                "started_at": now_iso(),
                "user": request.message,
                "ended_at": now_iso(),
                **result,
            }
        ],
    }
    write_transcript(transcript_path, transcript)
    return {
        **result,
        "transcript": {
            "id": transcript_id,
            "file": transcript_path.name,
            "path": public_path(transcript_path),
        },
        "artifact_version": artifact_version.artifact_version,
        "provider": request.provider,
        "model": selected_model,
    }
