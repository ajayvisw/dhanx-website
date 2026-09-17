#!/usr/bin/env python3
"""Import newly published API TO ROI videos from YouTube's public Atom feed.

No YouTube API key is needed.  The feed is checked by GitHub Actions and this
script updates the public archive only when it finds a video not already in it.
"""
from __future__ import annotations

import datetime as dt
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "js" / "blog.js"
CHANNEL_ID = "UCxCFLXnf5oFgqHw11vAwxww"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def clean(value: str, limit: int = 260) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if not value:
        return "A new investing and markets video from API TO ROI."
    return value[: limit - 1].rstrip() + "…" if len(value) > limit else value


def category(title: str) -> str:
    text = title.lower()
    if any(word in text for word in ("tax", "us investing", "rsu", "estate")):
        return "Cross-border wealth"
    if any(word in text for word in ("ai", "openai", "nvidia", "software", "saas")):
        return "AI & markets"
    if any(word in text for word in ("etf", "vwo")):
        return "ETF research"
    if any(word in text for word in ("p/e", "owner earnings", "valuation")):
        return "Investing basics"
    return "Company research"


def js_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ")


def main() -> int:
    archive = ARCHIVE.read_text(encoding="utf-8")
    existing = set(re.findall(r"\['([^']+)'\s*,", archive))
    with urllib.request.urlopen(FEED, timeout=30) as response:
        root = ET.fromstring(response.read())

    new_rows = []
    for entry in root.findall("atom:entry", NS):
        video_id = entry.findtext("yt:videoId", namespaces=NS)
        if not video_id or video_id in existing:
            continue
        title = clean(entry.findtext("atom:title", default="", namespaces=NS), 140)
        published = entry.findtext("atom:published", default="", namespaces=NS)
        try:
            date = dt.datetime.fromisoformat(published.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            print(f"Skipping {video_id}: invalid publication date", file=sys.stderr)
            continue
        description = clean(entry.findtext("media:group/media:description", default="", namespaces=NS))
        # YouTube does not expose a reliable Short flag in the Atom feed.
        # Listing it as Video is accurate and avoids guessing from duration.
        new_rows.append((video_id, date, category(title), "Video", title, description))

    if not new_rows:
        print("No new YouTube uploads found.")
        return 0

    rows = "".join(
        "['{}','{}','{}','{}','{}','{}'],".format(*(js_string(x) for x in row))
        for row in sorted(new_rows, key=lambda row: row[1], reverse=True)
    )
    marker = "const P=["
    if marker not in archive:
        raise RuntimeError("Could not find the archive array in js/blog.js")
    ARCHIVE.write_text(archive.replace(marker, marker + rows, 1), encoding="utf-8")
    print(f"Imported {len(new_rows)} new YouTube upload(s): " + ", ".join(row[0] for row in new_rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
