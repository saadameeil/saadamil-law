"""Notify IndexNow about public, already-published sitemap pages only."""
import json
import os
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ORIGIN = "https://saadamil.com/"
KEY_FILE = "09dfa077df5143ac933663f07e06aa0f.txt"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"

def sitemap_urls(raw):
    urls = [e.text for e in ET.fromstring(raw).findall(NS + "url/" + NS + "loc")]
    if not urls or len(urls) > 10000 or len(set(urls)) != len(urls):
        raise ValueError("Invalid sitemap URL count")
    for url in urls:
        u = urlsplit(url)
        if (u.scheme != "https" or u.netloc != "saadamil.com" or u.query or u.fragment
            or u.path.startswith(("/api/", "/data/", "/admin"))
            or not (u.path == "/" or u.path.endswith(".html"))):
            raise ValueError("Only canonical public HTML URLs are allowed")
    return urls


def changed_paths(event):
    """Actions push payloads omit added/modified arrays: compare the actual SHAs."""
    commits = event.get("commits", [])
    if commits and all("added" in c and "modified" in c for c in commits):
        return {p for c in commits for p in c["added"] + c["modified"]}
    before, after = event.get("before", ""), event.get("after", "")
    if not all(re.fullmatch(r"[a-f0-9]{40}", sha) for sha in (before, after)):
        raise ValueError("Missing validated before/after SHAs")
    if before == "0" * 40:
        return {"sitemap.xml"}
    req = Request(
        "https://api.github.com/repos/saadameeil/saadamil-law/compare/" + before + "..." + after,
        headers={"User-Agent": "SaadAmilIndexNow/1.0", "Accept": "application/vnd.github+json"})
    with urlopen(req, timeout=30) as response:
        comparison = json.load(response)
    files = comparison.get("files")
    if not isinstance(files, list):
        raise ValueError("GitHub comparison did not return changed files")
    # Compare returns at most 300 files. A bounded sitemap notification avoids truncation.
    if len(files) >= 300:
        return {"sitemap.xml"}
    return {f["filename"] for f in files if f.get("status") != "removed"}

def main():
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    if "[skip indexnow]" in event.get("head_commit", {}).get("message", ""):
        print("Already notified release: no duplicate submission")
        return
    urls = sitemap_urls(Path("sitemap.xml").read_bytes())
    if os.environ.get("GITHUB_EVENT_NAME") == "push":
        changed = changed_paths(event)
        if "sitemap.xml" not in changed:
            urls = [u for u in urls if (urlsplit(u).path.lstrip("/") or "index.html") in changed]
        if not urls:
            print("No changed public sitemap pages")
            return
    live_req = Request(ORIGIN + "sitemap.xml", headers={"User-Agent": "SaadAmilIndexNow/1.0", "Cache-Control": "no-cache"})
    with urlopen(live_req, timeout=30) as response:
        live_urls = set(sitemap_urls(response.read()))
    if not set(urls).issubset(live_urls):
        raise RuntimeError("Publish the new pages and live sitemap before notifying IndexNow")
    key = Path(KEY_FILE).read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"[a-f0-9]{32}", key) or KEY_FILE != key + ".txt":
        raise ValueError("Invalid public IndexNow verification file")
    payload = json.dumps({"host": "saadamil.com", "key": key, "keyLocation": ORIGIN + KEY_FILE, "urlList": urls}).encode()
    req = Request("https://api.indexnow.org/indexnow", data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=30) as response:
        if response.status not in (200, 202):
            raise RuntimeError("IndexNow did not accept submission")
        print(json.dumps({"accepted": True, "status": response.status, "public_urls": len(urls), "indexing_guaranteed": False}))

if __name__ == "__main__":
    main()
