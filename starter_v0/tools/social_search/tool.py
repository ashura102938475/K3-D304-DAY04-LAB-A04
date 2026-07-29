from __future__ import annotations

from typing import Any

from tools._shared import err
from tools._twitter_api import twitter_get


def _tweet_item(raw: dict[str, Any]) -> dict[str, Any]:
    handle = raw.get("screen_name") or (raw.get("author") or {}).get("screen_name") or ""
    tweet_id = raw.get("tweet_id") or raw.get("id") or ""
    text = (raw.get("text") or "").strip()
    return {
        "title": text.split("\n")[0][:120],
        "summary": text,
        "url": f"https://x.com/{handle}/status/{tweet_id}" if handle and tweet_id else "",
        "source": f"@{handle}" if handle else "x.com",
        "date": raw.get("created_at"),
        "metrics": {"favorites": raw.get("favorites"), "retweets": raw.get("retweets"), "views": raw.get("views")},
    }


def _tweets_from(data: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    raw_items = data.get("timeline") or data.get("tweets") or []
    items = [_tweet_item(item) for item in raw_items if item.get("tweet_id") or item.get("id")]
    return items[: int(limit or 5)]


def search_tweets(query: str = "", search_type: str = "Latest", limit: int = 5) -> dict[str, Any]:
    try:
        data = twitter_get("/search.php", {"query": query, "search_type": search_type})
        return {"tool": "search_tweets", "query": query, "search_type": search_type, "items": _tweets_from(data, limit)}
    except Exception as exc:
        return err("search_tweets", exc)

