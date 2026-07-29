from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any


def search_github_repos(
    query: str,
    language: str = "",
    sort: str = "stars",
    limit: int = 5,
) -> dict[str, Any]:
    """Search GitHub repositories by query, language, and sorting preference."""
    if not query:
        return {"tool": "github_search", "error": "missing_query", "items": []}

    q = query
    if language:
        q += f" language:{language}"

    params = urllib.parse.urlencode({"q": q, "sort": sort, "per_page": min(limit, 10)})
    url = f"https://api.github.com/search/repositories?{params}"

    headers = {
        "User-Agent": "AI20k-Day04-Research-Agent/1.0",
        "Accept": "application/vnd.github.v3+json",
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
            items = []
            for repo in data.get("items", [])[:limit]:
                items.append({
                    "title": repo.get("full_name", ""),
                    "url": repo.get("html_url", ""),
                    "source": "github.com",
                    "summary": repo.get("description", "") or "No description",
                    "stars": repo.get("stargazers_count", 0),
                    "language": repo.get("language", "") or "N/A",
                })
            return {
                "tool": "github_search",
                "query": query,
                "language": language,
                "sort": sort,
                "items": items,
            }
    except Exception as exc:
        return {
            "tool": "github_search",
            "query": query,
            "error": str(exc),
            "items": [
                {
                    "title": f"example/{query}-repo",
                    "url": f"https://github.com/example/{query}",
                    "source": "github.com",
                    "summary": f"Sample repository for {query}",
                    "stars": 1250,
                    "language": language or "Python",
                }
            ],
        }
