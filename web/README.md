# Research Agent React UI

Dashboard for the Day 04 research agent lab.

## Run locally

From `starter_v0`, start the API:

```bash
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

From `web`, start React:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## What the UI shows

- Live chat playground backed by `starter_v0/chat.py`
- Tool trace with tool name, args, and result/error
- Run evidence from `starter_v0/runs/*.json`
- Version evidence from `starter_v0/artifacts/version_log.csv`
- Tool catalog from `starter_v0/artifacts/tools.yaml`
