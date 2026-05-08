#!/usr/bin/env python3
"""
AEO Readiness Scorer (offline, static).

Inspired by Aleyda Solis's 3-layer framework (Presence / Readiness / Impact).
This script scores the *Readiness* layer only: structural and semantic
fitness for retrieval and citation by AI search engines.

Inputs: a path to a saved HTML file (or a URL fetched offline-style via
urllib).
Outputs: a JSON score with per-signal verdicts and a prioritized fix list.

Signals checked:
  - llms.txt presence (root)
  - schema.org JSON-LD blocks present
  - Article / Product / FAQPage / Organization @types
  - <h1> uniqueness, <title> length
  - canonical link
  - meta description length
  - FAQ structure (definitionList, schema FAQPage)
  - paragraph length (LLMs cite shorter paragraphs)
  - first-paragraph entity density (named entities)
  - external citations / sources block

This is a starting harness. Usage:

  python aeo-readiness-scorer.py <path-or-url>
"""
import json, re, sys, urllib.request
from urllib.parse import urlparse

SIGNAL_WEIGHTS = {
    "llms_txt": 5,
    "jsonld_present": 5,
    "schema_types": 4,
    "title": 3,
    "h1": 3,
    "canonical": 3,
    "meta_description": 3,
    "faq_structure": 4,
    "paragraph_length": 4,
    "first_para_entities": 3,
    "external_citations": 3,
}

def fetch(target: str) -> tuple[str, str | None]:
    """Return (html, base_url). Accepts file path or http(s) URL."""
    if target.startswith(("http://", "https://")):
        req = urllib.request.Request(target, headers={"User-Agent": "aeo-readiness-scorer/0.1"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.read().decode("utf-8", "replace"), target
    with open(target, "r", encoding="utf-8") as f:
        return f.read(), None

def check_llms_txt(base_url: str | None) -> dict:
    if not base_url:
        return {"verdict": "n/a", "note": "needs http(s) URL to probe /llms.txt"}
    parsed = urlparse(base_url)
    probe = f"{parsed.scheme}://{parsed.netloc}/llms.txt"
    try:
        with urllib.request.urlopen(probe, timeout=5) as r:
            ok = r.status == 200
            return {"verdict": "pass" if ok else "fail", "url": probe}
    except Exception as e:
        return {"verdict": "fail", "url": probe, "error": str(e)[:80]}

def jsonld_blocks(html: str) -> list[dict]:
    blocks = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
                       html, re.DOTALL | re.IGNORECASE)
    out = []
    for b in blocks:
        try:
            out.append(json.loads(b.strip()))
        except Exception:
            continue
    return out

def extract_types(jsonld: list) -> list[str]:
    types = []
    def walk(o):
        if isinstance(o, dict):
            t = o.get("@type")
            if isinstance(t, str): types.append(t)
            elif isinstance(t, list): types.extend(t)
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    for b in jsonld: walk(b)
    return sorted(set(types))

def first_match(html: str, pattern: str) -> str | None:
    m = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None

def paragraphs(html: str) -> list[str]:
    return [re.sub(r"<[^>]+>", "", p).strip()
            for p in re.findall(r"<p[^>]*>(.*?)</p>", html, re.DOTALL | re.IGNORECASE)]

def entity_density(text: str) -> int:
    return len(re.findall(r"\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3}\b", text))

def score(html: str, base_url: str | None) -> dict:
    jsonld = jsonld_blocks(html)
    types = extract_types(jsonld)
    title = first_match(html, r"<title[^>]*>(.*?)</title>")
    h1 = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.DOTALL | re.IGNORECASE)
    canon = first_match(html, r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']')
    desc = first_match(html, r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']')
    paras = paragraphs(html)
    long_paras = [p for p in paras if len(p) > 600]
    first_para = paras[0] if paras else ""
    fpe = entity_density(first_para)
    has_faq = "FAQPage" in types or "<dl" in html.lower() or bool(re.search(r"\bfaq\b", html, re.IGNORECASE))
    has_citations = bool(re.search(r"\b(source|citation|reference)s?\b", html, re.IGNORECASE))

    signals = {
        "llms_txt": check_llms_txt(base_url),
        "jsonld_present": {"verdict": "pass" if jsonld else "fail", "count": len(jsonld)},
        "schema_types": {"verdict": "pass" if types else "fail", "types": types[:8]},
        "title": {"verdict": "pass" if title and 30 <= len(title) <= 65 else "fail",
                  "value": title, "len": len(title) if title else 0},
        "h1": {"verdict": "pass" if len(h1) == 1 else "fail", "count": len(h1)},
        "canonical": {"verdict": "pass" if canon else "fail", "value": canon},
        "meta_description": {"verdict": "pass" if desc and 80 <= len(desc) <= 200 else "fail",
                             "len": len(desc) if desc else 0},
        "faq_structure": {"verdict": "pass" if has_faq else "fail"},
        "paragraph_length": {"verdict": "pass" if len(long_paras) == 0 else "fail",
                             "long_para_count": len(long_paras), "total": len(paras)},
        "first_para_entities": {"verdict": "pass" if fpe >= 3 else "fail", "count": fpe},
        "external_citations": {"verdict": "pass" if has_citations else "fail"},
    }

    earned = sum(SIGNAL_WEIGHTS[k] for k, v in signals.items() if v.get("verdict") == "pass")
    possible = sum(SIGNAL_WEIGHTS.values())
    fixes = sorted(
        [{"signal": k, "weight": SIGNAL_WEIGHTS[k], "detail": v}
         for k, v in signals.items() if v.get("verdict") == "fail"],
        key=lambda x: -x["weight"],
    )
    return {
        "score": earned,
        "possible": possible,
        "ratio": round(earned / possible, 2),
        "signals": signals,
        "prioritized_fixes": fixes,
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    html, base = fetch(sys.argv[1])
    print(json.dumps(score(html, base), indent=2))
