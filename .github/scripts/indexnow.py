"""Validate the published sitemap and optionally notify IndexNow once.

Dry run by default. Standard library only; no account credentials required.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
import xml.etree.ElementTree as ET

ORIGIN = "https://saadamil.com"
KEY = "09dfa077df5143ac933663f07e06aa0f"
ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_PAGES = 100
MAX_BYTES = 2_000_000


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def page_url(url):
    p = urlsplit(url)
    if (p.scheme != "https" or p.netloc != "saadamil.com" or p.query or
            p.fragment or any(ord(c) <= 32 for c in url) or "\\" in url):
        raise ValueError("Unexpected page URL")
    path = unquote(p.path)
    if ("%" in path or "\\" in path or ".." in path.split("/") or
            path.startswith(("/api/", "/data/", "/.github/")) or
            path in ("/admin.html", "/petition.html", "/decode_qr.html") or
            not (path == "/" or path.endswith(".html"))):
        raise ValueError("Not a public content page")
    return url


def sitemap_urls(raw):
    root = ET.fromstring(raw)
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    if root.tag != ns + "urlset":
        raise ValueError("Expected a URL sitemap")
    urls = [page_url(n.text or "") for n in root.findall(ns + "url/" + ns + "loc")]
    if not 1 <= len(urls) <= MAX_PAGES or len(urls) != len(set(urls)):
        raise ValueError("Empty, duplicate or oversized sitemap")
    return urls


def get(url):
    req = Request(url, headers={"User-Agent": "SaadAmil-IndexNow-Check/1.0"})
    with build_opener(NoRedirect()).open(req, timeout=20) as response:
        raw = response.read(MAX_BYTES + 1)
        if response.status != 200 or len(raw) > MAX_BYTES:
            raise ValueError("Unexpected response status or size")
        return raw, response.headers


class PageMeta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonicals.append(a.get("href", ""))
        if tag == "meta" and a.get("name", "").lower() in ("robots", "bingbot", "googlebot"):
            directives = a.get("content", "").lower().replace(",", " ").split()
            self.noindex |= "noindex" in directives or "none" in directives


def check_page(url, raw, headers):
    if "text/html" not in headers.get("Content-Type", "").lower():
        raise ValueError("Expected HTML: " + url)
    parser = PageMeta()
    parser.feed(raw.decode("utf-8-sig"))
    directives = headers.get("X-Robots-Tag", "").lower().replace(",", " ").split()
    if parser.noindex or "noindex" in directives or "none" in directives:
        raise ValueError("Page excludes indexing: " + url)
    if parser.canonicals != [url]:
        raise ValueError("Canonical mismatch: " + url)
    return {"url": url, "status": 200, "canonical": url,
            "sha256": hashlib.sha256(raw).hexdigest()}


def run(submit=False, report_path=None):
    report = {"checked_utc": datetime.now(timezone.utc).isoformat(),
              "submitted": False, "indexing_confirmed": False, "pages": []}
    try:
        raw, _ = get(ORIGIN + "/sitemap.xml")
        urls = sitemap_urls(raw)
        key_raw, _ = get(ORIGIN + "/" + KEY + ".txt")
        if key_raw.decode("utf-8-sig").strip() != KEY:
            raise ValueError("Published ownership key mismatch")
        for url in urls:
            body, headers = get(url)
            report["pages"].append(check_page(url, body, headers))
        report["validated_urls"] = len(urls)
        if submit:
            payload = {"host": "saadamil.com", "key": KEY,
                       "keyLocation": ORIGIN + "/" + KEY + ".txt", "urlList": urls}
            req = Request(ENDPOINT, data=json.dumps(payload).encode("utf-8"), method="POST",
                          headers={"Content-Type": "application/json; charset=utf-8"})
            # No retry: an ambiguous network result must be inspected before resubmission.
            with build_opener(NoRedirect()).open(req, timeout=30) as response:
                report["submission_status"] = response.status
                if response.status not in (200, 202):
                    raise ValueError("Unexpected IndexNow response")
                report["submitted"] = True
                report["key_validation_pending"] = response.status == 202
        return report
    except Exception as exc:
        report["error"] = str(exc)
        raise
    finally:
        if report_path:
            Path(report_path).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--submit", action="store_true")
    parser.add_argument("--report", default="indexnow-result.json")
    args = parser.parse_args()
    result = run(args.submit, args.report)
    print(json.dumps({k: v for k, v in result.items() if k != "pages"}, ensure_ascii=False))
