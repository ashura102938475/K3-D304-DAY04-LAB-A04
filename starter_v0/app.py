"""
app.py — Research Agent Streamlit UI
Reuses run_model_tool_loop from chat.py — no second agent loop.
Run: streamlit run app.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import streamlit as st

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

# ─────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────
ARTIFACTS_DIR = ROOT / "artifacts"
TRANSCRIPTS_DIR = ROOT / "transcripts"
RUNS_DIR = ROOT / "runs"
SAMPLE_TX_DIR = ROOT / "samples" / "transcripts"
TRANSCRIPTS_DIR.mkdir(exist_ok=True)

PROVIDERS = ["openrouter", "openai", "anthropic", "gemini", "nvidia", "nim"]
VERSIONS = ["v3", "v2", "v1", "v0"]

# ─────────────────────────────────────────────────────
# Page Config
# ─────────────────────────────────────────────────────
st.set_page_config(
    page_title="Research Agent",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────
# CSS — Dark Glassmorphism
# ─────────────────────────────────────────────────────
st.markdown(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

html, body, .stApp {
    background: linear-gradient(160deg, #07090f 0%, #0d1220 60%, #07090f 100%) !important;
    font-family: 'Inter', sans-serif !important;
}
#MainMenu, footer, header { visibility: hidden; }
.stDeployButton { display: none; }

[data-testid="stSidebar"] {
    background: rgba(7, 9, 20, 0.98) !important;
    border-right: 1px solid rgba(255,255,255,0.07) !important;
}
h1, h2, h3, h4 {
    font-family: 'Inter', sans-serif !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
    color: #f1f5f9 !important;
}

/* Tabs */
.stTabs [data-baseweb="tab-list"] { background: transparent; gap: 6px; }
.stTabs [data-baseweb="tab"] {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 8px !important;
    color: #94a3b8 !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
    padding: 8px 18px !important;
    transition: all 0.2s !important;
}
.stTabs [data-baseweb="tab"]:hover {
    background: rgba(255,255,255,0.08) !important;
    color: #e2e8f0 !important;
}
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    color: white !important;
    border-color: transparent !important;
    box-shadow: 0 4px 15px rgba(99,102,241,0.4) !important;
}
.stTabs [data-baseweb="tab-panel"] { padding-top: 24px; }

/* Buttons */
.stButton > button {
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-family: 'Inter', sans-serif !important;
    letter-spacing: 0.02em !important;
    box-shadow: 0 4px 15px rgba(99,102,241,0.4) !important;
    transition: all 0.2s ease !important;
}
.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 22px rgba(99,102,241,0.55) !important;
}
.stButton > button:active { transform: translateY(0) !important; }

/* Inputs */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #f1f5f9 !important;
    border-radius: 10px !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.9rem !important;
}
.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus {
    border-color: rgba(99,102,241,0.6) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
    outline: none !important;
}
.stTextInput > label, .stTextArea > label, .stSelectbox > label {
    color: #94a3b8 !important;
    font-size: 0.8rem !important;
    font-weight: 500 !important;
}

/* Selectbox */
.stSelectbox > div > div {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #f1f5f9 !important;
    border-radius: 8px !important;
}

/* Expanders */
details[data-testid="stExpander"] summary {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 8px !important;
    color: #94a3b8 !important;
    font-size: 0.84rem !important;
    font-weight: 500 !important;
}
details[data-testid="stExpander"] summary:hover {
    background: rgba(255,255,255,0.07) !important;
    color: #e2e8f0 !important;
}

/* Code */
.stCode, code, pre {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.78rem !important;
    background: rgba(0,0,0,0.35) !important;
    border-radius: 8px !important;
    border: 1px solid rgba(255,255,255,0.07) !important;
}

/* Dividers */
hr { border-color: rgba(255,255,255,0.07) !important; margin: 20px 0 !important; }

/* Metrics */
[data-testid="metric-container"] {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 10px !important;
    padding: 12px 16px !important;
}
[data-testid="metric-container"] label { color: #64748b !important; font-size: 0.75rem !important; }
[data-testid="metric-container"] [data-testid="stMetricValue"] {
    color: #a5b4fc !important;
    font-weight: 700 !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
</style>
""",
    unsafe_allow_html=True,
)


# ─────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────


def pct_badge(val: float | None) -> str:
    if val is None:
        return '<span style="color:#475569">—</span>'
    pct = round(val * 100)
    color = "#10b981" if pct >= 80 else "#f59e0b" if pct >= 50 else "#ef4444"
    return (
        f'<span style="color:{color};font-weight:700;'
        f"font-family:'JetBrains Mono',monospace\">{pct}%</span>"
    )


def status_icon(status: str) -> str:
    return {
        "answered": "🟢",
        "waiting_for_user": "🟡",
        "max_tool_rounds": "🔴",
        "error": "🔴",
    }.get(status, "⚪")


def load_run(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def list_runs() -> list[Path]:
    return sorted(RUNS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)


def list_transcripts() -> list[Path]:
    paths = list(TRANSCRIPTS_DIR.glob("*.transcript.json"))
    if SAMPLE_TX_DIR.exists():
        paths += list(SAMPLE_TX_DIR.glob("*.transcript.json"))
    return sorted(paths, key=lambda p: p.stat().st_mtime, reverse=True)


def render_artifact_badge(av_str: str, prompt_hash: str, tools_hash: str) -> None:
    ph = prompt_hash[:8] if prompt_hash else "—"
    th = tools_hash[:8] if tools_hash else "—"
    st.markdown(
        f"""<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <span style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);
        border-radius:20px;padding:3px 14px;font-size:0.78rem;color:#a5b4fc;
        font-family:'JetBrains Mono',monospace;font-weight:600">📌 {av_str}</span>
        <span style="font-size:0.72rem;color:#475569;font-family:'JetBrains Mono',monospace;
        background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px">prompt:{ph}</span>
        <span style="font-size:0.72rem;color:#475569;font-family:'JetBrains Mono',monospace;
        background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px">tools:{th}</span>
        </div>""",
        unsafe_allow_html=True,
    )


def render_tool_trace(rounds: list[dict[str, Any]], _tool_events: list[dict[str, Any]]) -> None:
    """Render each tool round with calls + results side by side."""
    for rnd in rounds:
        calls = rnd.get("tool_calls", [])
        results_list = rnd.get("tool_results", [])
        if not calls:
            continue

        round_num = rnd.get("round", "?")
        st.markdown(
            f'<div style="font-size:0.72rem;color:#475569;font-weight:700;'
            f"text-transform:uppercase;letter-spacing:0.12em;margin:14px 0 8px;"
            f'display:flex;align-items:center;gap:8px">'
            f'<span style="background:rgba(99,102,241,0.2);color:#a5b4fc;'
            f"border-radius:4px;padding:1px 8px\">Round {round_num}</span></div>",
            unsafe_allow_html=True,
        )

        for idx, call in enumerate(calls):
            result_data = results_list[idx] if idx < len(results_list) else {}
            result = result_data.get("result", {})
            has_error = isinstance(result, dict) and "error" in result
            icon = "❌" if has_error else "✅"
            status_label = "error" if has_error else "ok"
            tool_name = call.get("name", "?")

            with st.expander(
                f"{icon} `{tool_name}` — {status_label}",
                expanded=(not has_error),
            ):
                col_args, col_res = st.columns(2)
                with col_args:
                    st.markdown(
                        '<div style="font-size:0.78rem;color:#94a3b8;'
                        'font-weight:600;margin-bottom:4px">📥 Args</div>',
                        unsafe_allow_html=True,
                    )
                    st.code(
                        json.dumps(call.get("args", {}), indent=2, ensure_ascii=False),
                        language="json",
                    )
                with col_res:
                    st.markdown(
                        '<div style="font-size:0.78rem;color:#94a3b8;'
                        'font-weight:600;margin-bottom:4px">📤 Result</div>',
                        unsafe_allow_html=True,
                    )
                    result_str = json.dumps(result, indent=2, ensure_ascii=False, default=str)
                    if len(result_str) > 2500:
                        result_str = result_str[:2500] + "\n... <truncated>"
                    st.code(result_str, language="json")


def chat_bubble_user(content: str) -> None:
    st.markdown(
        f'<div style="display:flex;justify-content:flex-end;margin:10px 0">'
        f'<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);'
        f"border-radius:18px 18px 4px 18px;padding:12px 18px;color:white;"
        f"max-width:82%;font-size:0.9rem;line-height:1.6;"
        f'box-shadow:0 4px 18px rgba(99,102,241,0.3)">'
        f"{content}</div></div>",
        unsafe_allow_html=True,
    )


def chat_bubble_agent(content: str, status: str) -> None:
    icon = status_icon(status)
    status_color = {
        "answered": "#10b981",
        "waiting_for_user": "#f59e0b",
        "max_tool_rounds": "#ef4444",
        "error": "#ef4444",
    }.get(status, "#94a3b8")
    st.markdown(
        f'<div style="display:flex;margin:10px 0">'
        f'<div style="background:rgba(255,255,255,0.04);'
        f"border:1px solid rgba(255,255,255,0.1);"
        f"border-radius:18px 18px 18px 4px;padding:12px 18px;color:#f1f5f9;"
        f'max-width:82%;font-size:0.9rem;line-height:1.6;backdrop-filter:blur(8px)">'
        f'<div style="font-size:0.7rem;color:{status_color};font-weight:600;'
        f'margin-bottom:6px">{icon} {status.upper().replace("_"," ")}</div>'
        f"{content}</div></div>",
        unsafe_allow_html=True,
    )


# ─────────────────────────────────────────────────────
# Session State Init
# ─────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages: list[dict[str, Any]] = []
if "transcript_data" not in st.session_state:
    st.session_state.transcript_data: dict[str, Any] | None = None
if "transcript_path" not in st.session_state:
    st.session_state.transcript_path: str | None = None

# ─────────────────────────────────────────────────────
# Sidebar
# ─────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(
        """<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
        border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;
        box-shadow:0 6px 24px rgba(99,102,241,0.45)">
        <div style="font-size:2.2rem;margin-bottom:4px">🔬</div>
        <div style="color:white;font-weight:800;font-size:1.05rem;
        letter-spacing:0.06em;text-transform:uppercase">Research Agent</div>
        <div style="color:rgba(255,255,255,0.6);font-size:0.72rem;margin-top:4px">
        Tool Eval Dashboard</div>
        </div>""",
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div style="color:#64748b;font-size:0.72rem;font-weight:600;'
        'text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">⚙️ Config</div>',
        unsafe_allow_html=True,
    )
    provider_sel = st.selectbox("Provider", PROVIDERS, index=0)
    version_sel = st.selectbox("Version", VERSIONS, index=0)

    # Artifact version info
    system_prompt_path = ARTIFACTS_DIR / "system_prompt.md"
    tools_path = ARTIFACTS_DIR / "tools.yaml"
    av_obj = None
    try:
        av_obj = build_artifact_version(version_sel, system_prompt_path, tools_path)
        st.markdown(
            f"""<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.07);
            border-radius:10px;padding:14px;margin:14px 0;
            font-family:'JetBrains Mono',monospace;font-size:0.72rem">
            <div style="color:#6366f1;font-weight:700;margin-bottom:8px">🔏 Artifact Version</div>
            <div style="color:#a5b4fc;font-weight:600;margin-bottom:6px;word-break:break-all">
            {av_obj.artifact_version}</div>
            <div style="color:#475569">prompt:<br>
            <span style="color:#64748b">{av_obj.prompt_hash[:16]}</span></div>
            <div style="color:#475569;margin-top:4px">tools:<br>
            <span style="color:#64748b">{av_obj.tools_hash[:16]}</span></div>
            </div>""",
            unsafe_allow_html=True,
        )
    except Exception as exc:
        st.warning(f"Artifact version error: {exc}")

    st.markdown("---")

    st.markdown(
        '<div style="color:#64748b;font-size:0.72rem;font-weight:600;'
        'text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">📊 Stats</div>',
        unsafe_allow_html=True,
    )
    run_count = len(list(RUNS_DIR.glob("*.json")))
    tx_count = len(list(TRANSCRIPTS_DIR.glob("*.transcript.json")))
    c1, c2 = st.columns(2)
    c1.metric("Runs", run_count)
    c2.metric("Transcripts", tx_count)

    st.markdown("---")

    if st.session_state.transcript_path:
        tx_name = Path(st.session_state.transcript_path).name
        st.markdown(
            f'<div style="font-size:0.73rem;color:#475569;margin-bottom:10px">'
            f'📝 Active transcript:<br>'
            f'<code style="font-size:0.68rem;color:#64748b;word-break:break-all">'
            f"{tx_name}</code></div>",
            unsafe_allow_html=True,
        )

    if st.button("🗑️ New Conversation", use_container_width=True):
        st.session_state.messages = []
        st.session_state.transcript_data = None
        st.session_state.transcript_path = None
        st.rerun()

# ─────────────────────────────────────────────────────
# Main Tabs
# ─────────────────────────────────────────────────────
tab_chat, tab_evidence, tab_transcripts = st.tabs([
    "💬  Live Chat",
    "📊  Evidence",
    "📋  Transcripts",
])

# ══════════════════════════════════════════════════════
# TAB 1 — LIVE CHAT
# ══════════════════════════════════════════════════════
with tab_chat:
    col_h, col_badge = st.columns([3, 2])
    with col_h:
        st.markdown("### 💬 Live Chat")
    with col_badge:
        if av_obj:
            render_artifact_badge(av_obj.artifact_version, av_obj.prompt_hash, av_obj.tools_hash)

    # Chat history
    if not st.session_state.messages:
        st.markdown(
            """<div style="text-align:center;padding:60px 20px;
            color:#334155;border:1px dashed rgba(255,255,255,0.08);
            border-radius:16px;margin-bottom:20px">
            <div style="font-size:3rem;margin-bottom:12px">🔬</div>
            <div style="font-size:1rem;font-weight:600;color:#475569">Start a conversation</div>
            <div style="font-size:0.82rem;margin-top:8px;color:#334155;line-height:1.8">
            💡 "Search for AI news today"<br>
            💡 "Get Elon Musk's latest tweets"<br>
            💡 "Fetch https://openai.com/blog"<br>
            💡 "What's trending in ML this week?"
            </div></div>""",
            unsafe_allow_html=True,
        )
    else:
        for msg in st.session_state.messages:
            role = msg["role"]
            content = msg["content"]
            meta = msg.get("meta", {})

            if role == "user":
                chat_bubble_user(content)
            else:
                status = meta.get("status", "answered")
                chat_bubble_agent(content, status)

                rounds = meta.get("rounds", [])
                tool_events = meta.get("tool_events", [])
                total_calls = sum(len(r.get("tool_calls", [])) for r in rounds)
                if total_calls > 0:
                    total_rounds = sum(1 for r in rounds if r.get("tool_calls"))
                    with st.expander(
                        f"🔍 Tool Trace — {total_calls} call(s) in {total_rounds} round(s)",
                        expanded=False,
                    ):
                        render_tool_trace(rounds, tool_events)

    st.markdown("---")

    # Input form
    with st.form("chat_form", clear_on_submit=True):
        user_input = st.text_area(
            "Message",
            placeholder="Search for AI news today, get Elon Musk's latest tweets, fetch a URL...",
            height=90,
            label_visibility="collapsed",
        )
        col_btn, col_meta = st.columns([1, 4])
        with col_btn:
            submitted = st.form_submit_button("Send ➤", use_container_width=True)
        with col_meta:
            st.markdown(
                f'<div style="padding-top:12px;font-size:0.78rem;color:#475569">'
                f'Provider: <b style="color:#6366f1">{provider_sel}</b> · '
                f'Version: <b style="color:#6366f1">{version_sel}</b> · '
                f"max 4 tool rounds</div>",
                unsafe_allow_html=True,
            )

    if submitted and user_input.strip():
        st.session_state.messages.append({"role": "user", "content": user_input.strip()})

        with st.spinner("🔬 Agent thinking..."):
            try:
                system_prompt = system_prompt_path.read_text(encoding="utf-8")
                tool_decls = load_tool_declarations(tools_path)
                openai_tools = to_openai_tools(tool_decls)
                provider = make_provider(provider_sel)
                av_cur = build_artifact_version(version_sel, system_prompt_path, tools_path)

                history = [
                    {"role": m["role"], "content": m["content"]}
                    for m in st.session_state.messages[:-1]
                ]
                messages = [
                    {"role": "system", "content": system_prompt},
                    *trim_history(history, 5),
                    {"role": "user", "content": user_input.strip()},
                ]

                result = run_model_tool_loop(
                    provider=provider,
                    messages=messages,
                    tools=openai_tools,
                    model=None,
                    max_tool_rounds=4,
                )

                st.session_state.messages.append({
                    "role": "assistant",
                    "content": result.get("assistant_text", ""),
                    "meta": result,
                })

                # Save / update transcript
                timestamp = datetime.now().strftime("%Y%m%dT%H%M%S%f")
                if st.session_state.transcript_data is None:
                    tx_id = "_".join([safe_slug(version_sel), safe_slug(provider_sel), timestamp])
                    tx_path = TRANSCRIPTS_DIR / f"{tx_id}.transcript.json"
                    st.session_state.transcript_path = str(tx_path)
                    st.session_state.transcript_data = {
                        "transcript_id": tx_id,
                        **artifact_version_dict(av_cur),
                        "provider": provider_sel,
                        "model": getattr(provider, "default_model", None),
                        "created_at": now_iso(),
                        "updated_at": now_iso(),
                        "turns": [],
                    }

                turn_idx = len(st.session_state.transcript_data["turns"]) + 1
                st.session_state.transcript_data["turns"].append({
                    "turn_index": turn_idx,
                    "started_at": now_iso(),
                    "user": user_input.strip(),
                    "ended_at": now_iso(),
                    **result,
                })
                write_transcript(
                    Path(st.session_state.transcript_path),
                    st.session_state.transcript_data,
                )

            except Exception as exc:
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": f"⚠️ **Error:** {exc}",
                    "meta": {"status": "error"},
                })

        st.rerun()

# ══════════════════════════════════════════════════════
# TAB 2 — EVIDENCE
# ══════════════════════════════════════════════════════
with tab_evidence:
    st.markdown("### 📊 Eval Evidence")
    st.markdown(
        '<div style="font-size:0.82rem;color:#475569;margin-bottom:20px">'
        "Metrics from <code>runs/*.json</code>. Valid only when "
        "<code>provider_error_cases = 0</code> and "
        "<code>measured_cases = total_cases</code>.</div>",
        unsafe_allow_html=True,
    )

    run_files = list_runs()

    if not run_files:
        st.info(
            "No run files found. Run:\n\n"
            "```bash\npython run_eval.py --provider openrouter --version v0 "
            "--suite base --eval-cases data/eval_base.json\n```"
        )
    else:
        # Version comparison table
        st.markdown("#### 🆚 Version Comparison")

        rows_html = ""
        for path in run_files:
            try:
                data = load_run(path)
                s = data.get("summary", {})
                ver = data.get("version", "?")
                suite = data.get("suite", "?")
                prov = data.get("provider", "?")
                case_acc = s.get("case_accuracy")
                routing = s.get("tool_routing_accuracy")
                args_acc = s.get("argument_accuracy")
                mt_acc = s.get("multiturn_accuracy")
                err_cases = s.get("provider_error_cases", 0)
                measured = s.get("measured_cases", "?")
                total = s.get("total_cases", "?")
                is_valid = err_cases == 0 and measured == total
                av_run = data.get("artifact_version", "—")

                valid_html = (
                    '<span style="color:#10b981;font-weight:600">✓</span>'
                    if is_valid
                    else '<span style="color:#ef4444;font-weight:600">✗</span>'
                )

                rows_html += f"""
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                  <td style="padding:10px 14px;font-family:'JetBrains Mono',monospace;
                  font-size:0.8rem;color:#a5b4fc;font-weight:600">{ver}</td>
                  <td style="padding:10px 14px;font-size:0.78rem;color:#64748b">{suite}</td>
                  <td style="padding:10px 14px;font-size:0.78rem;color:#64748b">{prov}</td>
                  <td style="padding:10px 14px;text-align:center">{pct_badge(case_acc)}</td>
                  <td style="padding:10px 14px;text-align:center">{pct_badge(routing)}</td>
                  <td style="padding:10px 14px;text-align:center">{pct_badge(args_acc)}</td>
                  <td style="padding:10px 14px;text-align:center">{pct_badge(mt_acc)}</td>
                  <td style="padding:10px 14px;text-align:center;font-size:0.78rem;
                  color:#64748b">{measured}/{total}</td>
                  <td style="padding:10px 14px;text-align:center">{valid_html}</td>
                  <td style="padding:10px 14px;font-family:'JetBrains Mono',monospace;
                  font-size:0.68rem;color:#334155;word-break:break-all">{av_run}</td>
                </tr>"""
            except Exception:
                continue

        st.markdown(
            f"""<div style="overflow-x:auto;border-radius:12px;
            border:1px solid rgba(255,255,255,0.07)">
            <table style="width:100%;border-collapse:collapse;
            background:rgba(255,255,255,0.02)">
              <thead>
                <tr style="background:rgba(99,102,241,0.12)">
                  <th style="padding:12px 14px;text-align:left;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;text-transform:uppercase;
                  letter-spacing:0.07em;white-space:nowrap">Version</th>
                  <th style="padding:12px 14px;text-align:left;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Suite</th>
                  <th style="padding:12px 14px;text-align:left;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Provider</th>
                  <th style="padding:12px 14px;text-align:center;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Case Acc</th>
                  <th style="padding:12px 14px;text-align:center;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Routing</th>
                  <th style="padding:12px 14px;text-align:center;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Args</th>
                  <th style="padding:12px 14px;text-align:center;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Multi-turn</th>
                  <th style="padding:12px 14px;text-align:center;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Cases</th>
                  <th style="padding:12px 14px;text-align:center;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Valid</th>
                  <th style="padding:12px 14px;text-align:left;font-size:0.73rem;
                  color:#94a3b8;font-weight:600;white-space:nowrap">Artifact</th>
                </tr>
              </thead>
              <tbody>{rows_html}</tbody>
            </table></div>""",
            unsafe_allow_html=True,
        )

        st.markdown("---")

        # Run Inspector
        st.markdown("#### 🔍 Run Inspector")
        run_names = [p.name for p in run_files]
        selected_run_name = st.selectbox("Select run file", run_names, key="ev_run_sel")

        if selected_run_name:
            run_path = RUNS_DIR / selected_run_name
            try:
                run_data = load_run(run_path)
                results = run_data.get("results", [])
                failures = [r for r in results if not (r.get("result") or {}).get("passed")]
                passes = [r for r in results if (r.get("result") or {}).get("passed")]

                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Total", len(results))
                m2.metric("✅ Passed", len(passes))
                m3.metric("❌ Failed", len(failures))
                run_summary = run_data.get("summary") or {}
                case_acc_val = run_summary.get("case_accuracy")
                m4.metric(
                    "Case Acc",
                    f"{round(case_acc_val * 100)}%" if case_acc_val is not None else "—",
                )

                if failures:
                    st.markdown("**Failed Cases:**")
                    for fail in failures:
                        fail_res = fail.get("result") or {}
                        case_id = fail.get("id", "?")
                        fail_type = (
                            fail_res.get("failure_type")
                            or fail_res.get("case_failure_type", "?")
                        )
                        with st.expander(f"❌ {case_id}  ·  {fail_type}"):
                            col_l, col_r = st.columns(2)
                            with col_l:
                                st.markdown("**Failures:**")
                                for f_item in fail_res.get("failures", []):
                                    st.markdown(f"- {f_item}")
                                mismatch = fail_res.get("observed_mismatch")
                                if mismatch:
                                    st.markdown(f"**Mismatch:** `{mismatch}`")
                            with col_r:
                                st.markdown("**Actual Tool Calls:**")
                                st.code(
                                    json.dumps(
                                        fail.get("actual_tool_calls", []),
                                        indent=2,
                                        ensure_ascii=False,
                                    ),
                                    language="json",
                                )
                elif results:
                    st.success("🎉 All cases passed!")

            except Exception as exc:
                st.error(f"Could not load run: {exc}")

# ══════════════════════════════════════════════════════
# TAB 3 — TRANSCRIPTS
# ══════════════════════════════════════════════════════
with tab_transcripts:
    st.markdown("### 📋 Transcripts")

    transcripts = list_transcripts()
    if not transcripts:
        st.info("No transcripts yet. Use Live Chat to create one.")
    else:
        tx_names = [p.name for p in transcripts]
        selected_tx_name = st.selectbox("Select transcript", tx_names, key="tx_sel")

        if selected_tx_name:
            tx_path_obj = next((p for p in transcripts if p.name == selected_tx_name), None)
            if tx_path_obj:
                try:
                    tx_data = json.loads(tx_path_obj.read_text(encoding="utf-8"))

                    av_str = tx_data.get("artifact_version", "?")
                    ph = tx_data.get("prompt_hash", "")
                    th = tx_data.get("tools_hash", "")
                    render_artifact_badge(av_str, ph, th)

                    col_a, col_b, col_c, col_d = st.columns(4)
                    col_a.metric("Provider", tx_data.get("provider", "?"))
                    col_b.metric("Version", tx_data.get("version", "?"))
                    col_c.metric("Turns", len(tx_data.get("turns", [])))
                    created = (tx_data.get("created_at") or "?")[:10]
                    col_d.metric("Created", created)

                    st.markdown("---")

                    for turn in tx_data.get("turns", []):
                        turn_num = turn.get("turn_index", "?")
                        st.markdown(
                            f'<div style="font-size:0.72rem;color:#475569;font-weight:600;'
                            f"text-transform:uppercase;letter-spacing:0.1em;"
                            f'margin-bottom:6px">Turn {turn_num}</div>',
                            unsafe_allow_html=True,
                        )

                        chat_bubble_user(turn.get("user", ""))

                        status = turn.get("status", "answered")
                        agent_text = turn.get("assistant_text") or ""
                        chat_bubble_agent(agent_text, status)

                        rounds = turn.get("rounds", [])
                        tool_events = turn.get("tool_events", [])
                        total_calls = sum(len(r.get("tool_calls", [])) for r in rounds)
                        if total_calls > 0:
                            with st.expander(
                                f"🔍 Tool Trace — {total_calls} call(s)",
                                expanded=False,
                            ):
                                render_tool_trace(rounds, tool_events)

                        st.markdown("---")

                except Exception as exc:
                    st.error(f"Could not load transcript: {exc}")
