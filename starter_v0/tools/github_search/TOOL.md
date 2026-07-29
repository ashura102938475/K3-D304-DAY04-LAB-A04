---
name: github_search
track: custom
kind: live_api
provider: GitHub Public API
requires_env: []
inputs: [query, language, sort, limit]
outputs: [items]
side_effect: false
---
# github_search

Searches GitHub for open-source repositories, libraries, or codebases based on keywords.

### When to use
- User asks to find GitHub repositories, open-source projects, codebases, or libraries (e.g. "Tìm repo GitHub về LLM agents", "Tìm các thư viện Python cho AI").

### When NOT to use
- User asks for general web news or web pages (use `lookup`).
- User asks for scientific academic papers (use `papers`).
- User asks for Twitter posts (use `timeline` or `social_search`).

### Argument Conventions
- `query` (string, required): Search query or keywords (e.g., "llm-agent", "rag").
- `language` (string, optional): Programming language filter (e.g., "python", "typescript"). Default is "".
- `sort` (string, enum: ["stars", "forks", "updated"]): Sorting criteria. Default is "stars".
- `limit` (integer, default: 5): Maximum number of repository items to return.
