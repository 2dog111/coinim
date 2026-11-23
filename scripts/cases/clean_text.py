"""Drop the «who told it, who reprinted it» noise from post text (owner, 22.11.2026).

A sentence that only says which outlet published, summarized or reprinted something is removed. A sentence that relays a
fact through an outlet («Reuters reported that X», «According to Activ8 Insights, X») keeps the fact alone. The
investigator itself is never treated as an outlet: its findings are the subject of the post.
"""
import re

DATE = r"(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2})?,?\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}|\d{4})"
MEDIA_WORDS = (r"News|Times|Journal|Post|Finance|Insights?|Investing(?:\.com)?|Bear Cave|newsletter|article|summary|tracker|portal|"
               r"Reuters|Bloomberg|CNBC|MarketWatch|Benzinga|Barron'?s|Forbes|Fortune|Insider|Yahoo|Ainvest|Sharecast|TipRanks|"
               r"The Fly|Seeking Alpha|Motley Fool|Zacks|Stocktitan|StockTitan|Speculator|MarketBeat|Simply Wall St|Proactive|"
               r"Nasdaq\.com|Shortfinder(?:\.com)?|Activ8|mlq\.ai|basisreport|Kalla Fakta|Guardian|Telegraph|Economist|FT|"
               r"Financial Times|Wall Street Journal|New York Times|Washington Post|Business Wire|GlobeNewswire|PR Newswire|"
               r"press|media|outlet|newspaper|website|blog|podcast|Substack|X post|post on X")
LEAD = rf"(?:(?:On|In|By)\s+{DATE},?\s+)?"
SUBJECT = rf"(?P<who>(?:an?|the)?\s*(?:[A-Z0-9][\w.&'’-]*\s+){{0,5}}?(?:{MEDIA_WORDS})(?:\s+[A-Z][\w.&'’-]*){{0,3}}(?:\s+newsletter)?(?:\s+by\s+[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)?)"
VERB = r"(?:reported|noted|wrote|said|stated|cited|summari[sz]ed|highlighted|listed|added|observed|calculated|tracked|recorded|dated|displayed|showed|logged)"
RELAY_THAT = re.compile(rf"^{LEAD}{SUBJECT}\s+(?:{VERB})(?:\s+on\s+{DATE})?(?:\s+on\s+[^,]+?findings\s+and\s+(?:noted|said|reported))?,?\s+(?:that\s+)?(?P<fact>.+)$")
ACCORDING = re.compile(rf"^{LEAD}[Aa]ccording to\s+{SUBJECT},\s+(?P<fact>.+)$")
PURE = re.compile(r"\b(reprint\w*|republish\w*|syndicated|summari[sz]ed|a summary|full text|covered the report|picked up the|"
                  r"carried the report|ran the (?:report|story)|published (?:this|these|the) (?:new )?(?:data|report|findings)|"
                  r"was (?:first )?published on|behind free registration|appeared on|reports? on record)\b", re.I)
MEDIA = re.compile(rf"\b(?:{MEDIA_WORDS})\b")
OBJECT = re.compile(r"^(?:the|its|their|[A-Z][\w.&'’ -]*?'s?)\s+(?:new\s+)?(?:report|allegations?|findings|filing|claims?|campaign|short position|"
                    r"criticism|research)\b", re.I)
PIVOT = re.compile(r",?\s+(?:noting|and noted|and reported|and said|and added|adding)\s+(?:that\s+)?(?P<fact>.+)$")
SHARES = re.compile(r"\b(shares?|stock)\s+(?:as\s+)?(up|down)\b")
VERB_IN = re.compile(r"\b(?:is|are|was|were|had|has|have|did|does|fell|rose|sank|lost|gained|dropped|moved|said|found|faced|"
                     r"put|paid|made|took|told|cut|ran|met|kept|left|sold|bought|won|became|\w+ed)\b")
BOILER = re.compile(r"^Short sellers? (?:earn|make money|profit)s? when (?:a company's |the )?shares? (?:fall|drop)s?\.?$", re.I)


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9“\"])", text) if s.strip()]


def _cap(s):
    return s[:1].upper() + s[1:] if s else s


AGGREGATORS = re.compile(r"\b(?:Activ8(?: Insights)?|Webull|Benzinga|Yahoo Finance|Markets Insider|Business Insider Markets|Investing\.com|"
                         r"Ainvest|TipRanks|TheFly|The Fly|MarketBeat|Stocktitan|StockTitan|Hedge Fund Alpha|Shortfinder(?:\.com)?|"
                         r"Simply Wall St|Seeking Alpha|Insider Monkey|Sharecast(?: News)?|The Manila Times|Fraud News Network|"
                         r"Breakout Point|tracking (?:site|data)|activist tracking summary)\b")
CLAUSE = re.compile(r"(?:,\s*(?:and|while|but|though)\s+|;\s+)")


def drop_aggregators(s, investigator_names):
    """A price move or a mention that only a tracker or a news aggregator recorded: the clause goes, or the sentence."""
    own = [re.sub(r"^the\s+", "", n.lower()) for n in investigator_names if n]
    def foreign(text):
        m = AGGREGATORS.search(text)
        return m and not any(o and o in m.group(0).lower() for o in own)
    if not foreign(s):
        return s
    parts = CLAUSE.split(s)
    kept = [p for p in parts if not foreign(p)]
    if not kept or foreign(parts[0]):
        return None
    out = ", ".join(kept).rstrip(" ,;.") + "."
    return out if VERB_IN.search(out) and len(out.split()) >= 5 else None


TAIL_ACCORDING = re.compile(rf",?\s+according to\s+{SUBJECT}(?=[.,;]|$)")
TAIL_COMMENT = re.compile(r"\s+to\s+(?:a\s+)?[A-Z][\w.&'’ -]*?(?:'s|’s)?\s+request(?:s)? for comment")
REPORTED_BY = re.compile(rf"\s+(?:as\s+)?(?:reported|first reported|cited|quoted) by\s+{SUBJECT}(?:\s+on\s+{DATE})?(?=[.,;]|\s)")


def clean_sentence(s, investigator_names):
    out = _clean_sentence(s, investigator_names)
    return None if out is None else drop_aggregators(out, investigator_names)


def _clean_sentence(s, investigator_names):
    if BOILER.match(s):
        return None
    s = TAIL_COMMENT.sub("", s)
    by = REPORTED_BY.search(s)          # «a letter to investors reported by Bloomberg on April 17» → «a letter to investors»
    if by and not any(re.sub(r"^the\s+", "", n.lower()) in by.group("who").lower() for n in investigator_names if n):
        s = (s[:by.start()] + s[by.end():]).strip()
    tail = TAIL_ACCORDING.search(s)
    if tail and not any(re.sub(r"^the\s+", "", n.lower()) in tail.group("who").lower() for n in investigator_names if n):
        s = (s[:tail.start()] + s[tail.end():]).strip()
    inv = [re.sub(r"^the\s+", "", n.lower()).strip() for n in investigator_names if n]

    def is_investigator(who):
        w = re.sub(r"^(?:an?|the)\s+", "", who.lower().strip())
        return any(n and (n in w or w in n) for n in inv)

    for rx in (ACCORDING, RELAY_THAT):
        m = rx.match(s)
        if not m or is_investigator(m.group("who")):
            continue
        fact = m.group("fact").strip()
        said_that = bool(re.search(r"\bthat\s*$", s[:m.start("fact")]))
        if rx is RELAY_THAT and not said_that:
            if OBJECT.match(fact):       # «summarized the report, noting that X» → X; with no X there is nothing to keep
                pivot = PIVOT.search(fact)
                if not pivot:
                    listed = re.search(r"\b(?:and\s+)?(?:listed|displayed|showed|showing)\s+(?P<fact>.+)$", fact)
                    if not listed:
                        return None
                    fact = listed.group("fact")
                else:
                    fact = pivot.group("fact")
            elif not re.search(r"\d|%|\$", fact):
                return None              # «Yahoo Finance reported Left's criticism of …»: only that it was reported
        fact = re.sub(r",?\s+yet\s+\w+ed\b.*$", ".", fact).replace("..", ".")
        if PURE.search(fact) or not VERB_IN.search(fact) or re.match(r"^.{0,70}\bmarket value\b", fact) and not re.search(r"\b(fell|rose|lost|gained|dropped|wiped)\b", fact):
            return None
        fact = SHARES.sub(lambda x: f"{x.group(1)} {'were' if x.group(1).endswith('s') else 'was'} {x.group(2)}", fact)
        if len(fact.split()) < 5 or OBJECT.match(fact):
            return None
        return _cap(fact)
    if PURE.search(s) and MEDIA.search(s):
        return None
    return s


def clean_body(paragraphs, investigator_names):
    out, removed = [], 0
    for para in paragraphs:
        kept = []
        for s in sentences(para):
            c = clean_sentence(s, investigator_names)
            if c is None:
                removed += 1
            else:
                kept.append(c)
                removed += c != s
        if kept:
            out.append(" ".join(kept))
    return out, removed
