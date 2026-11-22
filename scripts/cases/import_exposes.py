#!/usr/bin/env python3
"""Turn Market Scan exposes posts (posts.json) into coin.im cases (lib/cases-data.json).

Rules from the owner (22.11.2026):
- one source only: the investigator's own report (the fund's page or PDF, or the newsroom's article);
  when that report no longer opens, the case has no link at all;
- English text as written by Market Scan; three points per card come from the post's own sentences;
- newest first.

Usage: python3 scripts/cases/import_exposes.py posts.json lib/cases-data.json [--no-check]
"""
import json
import re

from clean_text import clean_body
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

NOISE = re.compile(r"law firm|llp\b|rosen|pomerantz|levi & korsinsky|shkreli|bragar|glancy|bronstein|faruqi", re.I)
GENERIC_PATHS = re.compile(r"^/?(|home|index\.html?|about|disclosures?|track-record|press|research|reports?|sitemap\.xml|contact)/?$", re.I)
STATUS = {
    "alleged": "Allegation",
    "denied_by_company": "Company denies",
    "admitted_by_company": "Company admitted",
    "confirmed_by_regulator_or_court": "Confirmed by regulator or court",
    "not_confirmed": "Not confirmed",
}
DATE_LEAD = re.compile(r"^(On|In|By|As of)\s+[A-Z][a-z]+(\s+\d{1,2})?,?\s+\d{4},?\s+", re.U)


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9“\"])", text) if s.strip()]


GENERIC = re.compile(r"published (a|an|its)( new)? (short )?(report|investigation)|disclosed a short position|titled\b", re.I)
RELAY = re.compile(r"^(?!The report|The company|The firm|Shares|The stock)([A-Z][\w.&'’-]*(?: [A-Z][\w.&'’-]*){0,3}) (reported|listed|wrote|covered|noted)\b")


def points(paragraphs, lead=""):
    pool = []
    for pi, para in enumerate(paragraphs[1:], start=1):
        for si, sent in enumerate(sentences(para)):
            s = DATE_LEAD.sub("", sent)
            s = s[0].upper() + s[1:] if s else s
            if len(s) < 40:
                continue
            score = 0
            score += 2 if re.search(r"\d", s) else 0
            score += 1 if re.search(r"alleg|said|claim|report|found|denied|reject|fell|dropped|plunged|rose|charged|resign|sued|investigat", s, re.I) else 0
            score -= 2 if len(s) > 190 else 0
            score -= 3 if GENERIC.search(s) else 0
            score -= 3 if re.search(r"^Short sellers? (earn|make|profit)|meaning it (earns|profits)|earns when the shares fall", s, re.I) else 0
            score -= 2 if len(s) > 230 else 0
            m = RELAY.match(s)
            if m and not (lead and m.group(1).split()[0].lower() == lead.split()[0].lower()):
                score -= 3
            score += 1 if 60 <= len(s) <= 160 else 0
            pool.append((pi, si, score, s))
    chosen = []
    per = {}
    for pi, si, score, s in sorted(pool, key=lambda x: (-x[2], x[0], x[1])):
        if per.get(pi, 0) >= 2:
            continue
        chosen.append((pi, si, s))
        per[pi] = per.get(pi, 0) + 1
        if len(chosen) == 3:
            break
    for pi, si, score, s in pool:  # fewer than three paragraphs: fill from the rest
        if len(chosen) == 3:
            break
        if all(s != c[2] for c in chosen):
            chosen.append((pi, si, s))
    return [s for _, _, s in sorted(chosen)][:3]


RELAYS = re.compile(r"^(?:the bear cave|activ8 insights|shortfinder|breakout point)$", re.I)   # lists of other people's reports


def investigators(names):
    keep = [n for n in names if n and not NOISE.search(n)]
    real = [n for n in keep if not RELAYS.match(n.strip())]
    return real or keep or names[:1]


def report_candidates(post):
    out = []
    for src in post.get("sources") or []:
        url, label = src.get("url") or "", src.get("label") or ""
        path = urlparse(url).path
        if not url or GENERIC_PATHS.match(path):
            continue
        if "report" in label.lower() or "investigation" in label.lower():
            out.append(url)
    return out


def opens(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; coin.im link check)"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read(4096)
            return resp.status == 200 and (b"404" not in body[:300] or url.lower().endswith(".pdf"))
    except Exception:
        return False


LEGAL = re.compile(r"\b(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|ag|se|sa|nv|holdings?|group|the|enterprises)\b")


def company_key(name):
    s = re.sub(r"[.,'’()&]", " ", name.lower())
    return re.sub(r"\s+", " ", LEGAL.sub(" ", s)).strip()


def body_words(case):
    return set(re.findall(r"[a-z]{4,}|\d[\d.,]*", " ".join(case["body"]).lower()))


def same_research(a, b):
    """One investigation published as two posts: same company under another name or ticker, or the same
    investigator's same-day text about a neighbouring company (AMD and its Chinese customer, Sony and Ericsson)."""
    ka, kb = company_key(a["company"]), company_key(b["company"])
    if ka and kb and (ka == kb or re.search(rf"\b{re.escape(ka)}\b", kb) or re.search(rf"\b{re.escape(kb)}\b", ka)):
        return True
    if a["ticker"] and a["ticker"] == b["ticker"]:
        return True
    wa, wb = body_words(a), body_words(b)
    overlap = len(wa & wb) / max(1, len(wa | wb))
    first = lambda c: c["investigator"].split(",")[0].strip().lower()
    return overlap > 0.3 and first(a) == first(b) and min(len(wa), len(wb)) >= 40


def dedupe(cases):
    groups = []
    for case in cases:
        for group in groups:
            if any(same_research(case, other) for other in group):
                group.append(case)
                break
        else:
            groups.append([case])
    kept, dropped = [], []
    for group in groups:
        best = max(group, key=lambda c: (bool(c.get("source")), c["date"] or "", len(" ".join(c["body"]))))
        kept.append(best)
        dropped += [(c["slug"], best["slug"]) for c in group if c is not best]
    return kept, dropped


def main():
    src, dst = sys.argv[1], sys.argv[2]
    check = "--no-check" not in sys.argv
    posts = json.load(open(src))["posts"]
    cases = []
    for p in posts:
        names = investigators(p.get("investigators") or [])
        paras, _ = clean_body([x for x in p.get("paragraphs") or [] if x.strip()], names)
        if len(paras) < 2 or len(" ".join(paras).split()) < 60:   # nothing of substance left after the cleaning
            continue
        cases.append({
            "slug": p["slug"],
            "date": p.get("date") or "",
            "company": p.get("company") or "",
            "ticker": p.get("ticker") or "",
            "investigator": ", ".join(investigators(p.get("investigators") or [])[:2]),
            "status": STATUS.get(p.get("status"), "Allegation"),
            "title": p["title"],
            "points": points(paras, (investigators(p.get("investigators") or []) or [""])[0]),
            "body": paras,
            "candidates": report_candidates(p),
        })
    if check:
        urls = sorted({u for c in cases for u in c["candidates"]})
        with ThreadPoolExecutor(16) as pool:
            ok = dict(zip(urls, pool.map(opens, urls)))
    for c in cases:
        live = [u for u in c.pop("candidates") if not check or ok.get(u)]
        if live:
            name = c["investigator"].split(",")[0]
            c["source"] = {"label": f"{name} report" + (" (PDF)" if live[0].lower().endswith(".pdf") else ""), "url": live[0]}
    cases, dropped = dedupe(cases)
    for slug, kept in dropped:
        print(f"repeat: {slug} -> {kept}", file=sys.stderr)
    cases.sort(key=lambda c: (c["date"] or "0000"), reverse=True)
    json.dump(cases, open(dst, "w"), ensure_ascii=False, indent=1)
    print(json.dumps({"cases": len(cases), "repeats_removed": len(dropped), "with_source": sum(1 for c in cases if c.get("source")),
                      "three_points": sum(1 for c in cases if len(c["points"]) == 3)}))


if __name__ == "__main__":
    main()
