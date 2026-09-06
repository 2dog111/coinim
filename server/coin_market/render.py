from __future__ import annotations

import html
import io
import json
import os
import re
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import quote, urlsplit

from PIL import Image, ImageDraw, ImageFont

from .config import Settings
from .core import duration_text, format_usdt, parse_iso, shorten_txid, utc_now
from .qr import payment_request_url, tronlink_open_dapp_uri


def escape(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def page_shell(
    settings: Settings,
    title: str,
    description: str,
    body: str,
    *,
    canonical_path: str = "/",
    noindex: bool = False,
    page_class: str = "market-page",
    og_image_path: str = "/assets/coin-im-takeover-share.png",
    og_image_width: int = 1200,
    og_image_height: int = 630,
    extra_stylesheet: str = "",
    favicon_path: str = "/assets/favicon-32.png",
    theme_color: str = "#f4efe6",
) -> str:
    canonical = settings.site_url + canonical_path
    robots = "noindex, nofollow" if noindex else "index, follow, max-snippet:-1, max-image-preview:large"
    discovery_meta = "" if noindex else f"""
  <link rel="canonical" href="{escape(canonical)}">
  <link rel="alternate" hreflang="en" href="{escape(canonical)}">
  <link rel="alternate" hreflang="x-default" href="{escape(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="coin.im">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:url" content="{escape(canonical)}">
  <meta property="og:image" content="{escape(settings.site_url)}{escape(og_image_path)}">
  <meta property="og:image:width" content="{int(og_image_width)}">
  <meta property="og:image:height" content="{int(og_image_height)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(description)}">
  <meta name="twitter:image" content="{escape(settings.site_url)}{escape(og_image_path)}">"""
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <meta name="robots" content="{robots}">
  {discovery_meta}
  <meta name="theme-color" content="{escape(theme_color)}">
  <link rel="icon" type="image/png" sizes="32x32" href="{escape(favicon_path)}">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
  <link rel="preload" href="/assets/fonts/source-serif-4-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/takeover.css?v=20260901-market16">
  {f'<link rel="stylesheet" href="{escape(extra_stylesheet)}">' if extra_stylesheet else ''}
</head>
<body class="{escape(page_class)}">
  <a class="market-skip" href="#main-content">Skip to content</a>
  {body}
  <script src="/assets/takeover.js?v=20260901-market16" defer></script>
</body>
</html>"""


def header(current: str = "") -> str:
    links = [
        ("/", "Direct mail"),
        ("/archive", "Archive"),
        ("/stats", "Stats"),
        ("/rules", "Rules"),
    ]
    nav_items = []
    for path, label in links:
        current_attribute = ' aria-current="page"' if current == path else ""
        nav_items.append(f'<a href="{path}"{current_attribute}>{label}</a>')
    nav = "".join(nav_items)
    return f"""<header class="market-header">
  <a class="market-wordmark" href="/message" aria-label="coin.im message wall">coin<span aria-hidden="true">.</span>im</a>
  <nav aria-label="Market">{nav}</nav>
</header>"""


def footer() -> str:
    return """<footer class="market-footer">
  <p>Three paid places. A higher payment takes one.</p>
  <nav aria-label="Other coin.im routes">
    <a href="/rules">How it works</a><a href="/archive">Archive</a><a href="/stats">Stats</a>
    <a href="mailto:mail@coin.im">Email</a><a href="https://t.me/am7am">Telegram</a>
  </nav>
</footer>"""


SOCIAL_NETWORKS = (
    ("x", ("x.com", "twitter.com"), "#000000"),
    ("instagram", ("instagram.com",), "#e1306c"),
    ("facebook", ("facebook.com", "fb.com"), "#1877f2"),
    ("youtube", ("youtube.com", "youtu.be"), "#ff0000"),
    ("tiktok", ("tiktok.com",), "#000000"),
    ("reddit", ("reddit.com",), "#ff4500"),
    ("linkedin", ("linkedin.com",), "#0a66c2"),
    ("pinterest", ("pinterest.com", "pin.it"), "#e60023"),
    ("snapchat", ("snapchat.com",), "#fffc00"),
    ("whatsapp", ("wa.me", "whatsapp.com"), "#25d366"),
    ("threads", ("threads.net",), "#000000"),
    ("telegram", ("t.me", "telegram.me"), "#26a5e4"),
    ("discord", ("discord.com", "discord.gg"), "#5865f2"),
    ("twitch", ("twitch.tv",), "#9146ff"),
    ("bluesky", ("bsky.app",), "#0085ff"),
)
SOCIAL_PICKER = (
    ("youtube", "YouTube"),
    ("facebook", "Facebook"),
    ("instagram", "Instagram"),
    ("tiktok", "TikTok"),
    ("linkedin", "LinkedIn"),
    ("reddit", "Reddit"),
    ("snapchat", "Snapchat"),
    ("pinterest", "Pinterest"),
    ("x", "X"),
    ("threads", "Threads"),
    ("whatsapp", "WhatsApp"),
    ("telegram", "Telegram"),
    ("discord", "Discord"),
    ("twitch", "Twitch"),
    ("bluesky", "Bluesky"),
)


def _social_glass_icon(name: str) -> str:
    return f'<span class="social-glass-icon social-glass-icon--{escape(name)}" aria-hidden="true"></span>'


def _social_picker() -> str:
    return "".join(
        f'''<label class="social-option"><input type="radio" name="socialPlatform" value="{escape(name)}" required>
        {_social_glass_icon(name)}<span>{escape(label)}</span></label>'''
        for name, label in SOCIAL_PICKER
    )


def _social_profile(url: str) -> Optional[tuple[str, str, str, str]]:
    try:
        parsed = urlsplit(url)
    except ValueError:
        return None
    host = (parsed.hostname or "").lower().removeprefix("www.")
    for name, hosts, color in SOCIAL_NETWORKS:
        if host in hosts or any(host.endswith("." + candidate) for candidate in hosts):
            parts = [part for part in parsed.path.split("/") if part]
            handle = parts[0] if parts else host
            if name in {"linkedin", "youtube"} and len(parts) > 1 and parts[0] in {"in", "company", "c", "channel", "user"}:
                handle = parts[1]
            if name == "reddit" and len(parts) > 1 and parts[0] in {"u", "user"}:
                handle = parts[1]
            if name == "bluesky" and len(parts) > 1 and parts[0] == "profile":
                handle = parts[1]
            if name == "snapchat" and len(parts) > 1 and parts[0] in {"add", "p"}:
                handle = parts[1]
            if name == "x" and handle == "intent":
                handle = host
            return name, color, handle, host
    return None


def _social_icon(name: str) -> str:
    paths = {
        "x": '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
        "instagram": '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>',
        "facebook": '<path d="M14 8h4V3.5c-.7-.1-2.7-.3-5.1-.3C8.1 3.2 5 6.1 5 11.4V16H0v5h5v11h6V21h5l1-5h-6v-4.1C11 9.8 11.6 8 14 8z" transform="scale(.75) translate(5 0)"/>',
        "youtube": '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3z" fill="#fff"/>',
        "tiktok": '<path d="M15 3c.4 2.4 1.8 3.9 4 4.2v4a9 9 0 0 1-4-1.2v6.2a6.2 6.2 0 1 1-5.4-6.1v4.1a2.3 2.3 0 1 0 1.5 2.1V3z"/>',
        "reddit": '<circle cx="12" cy="13" r="8"/><circle cx="9" cy="13" r="1" fill="#ff4500"/><circle cx="15" cy="13" r="1" fill="#ff4500"/><path d="M9 16c2 1.4 4 1.4 6 0M13 5l1-3 3 1" fill="none" stroke="#ff4500" stroke-width="1.4"/>',
        "linkedin": '<path d="M4 8h4v12H4zm2-5a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 6 3zm4 5h4v1.7c.9-1.3 2.1-2.1 4.1-2.1 4 0 4.9 2.6 4.9 6.1V20h-4v-5.7c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V20H10z"/>',
        "pinterest": '<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-1.6 0-3.5.4-5.2l1.3-5.4s-.3-.8-.3-2c0-1.9 1.1-3.3 2.5-3.3 1.2 0 1.7.9 1.7 2 0 1.2-.7 2.9-1.1 4.5-.3 1.3.7 2.4 2 2.4 2.4 0 4.2-2.5 4.2-6.1 0-3.2-2.3-5.4-5.6-5.4-3.8 0-6 2.8-6 5.8 0 1.1.4 2.4 1 3 .1.1.1.2.1.4l-.4 1.5c-.1.5-.5.6-1 .4-3.6-1.7-3.6-6.8-1-9.8C8 2.7 10.2 2 12 2z"/>',
        "snapchat": '<path d="M12 3c3 0 4.5 2.4 4.5 5.4 0 1.4.2 2 1.5 2.7 1 .5.7 1.4-.4 1.7-.7.2-1 .4-1.2 1.1-.4 1.2-1.4 1.6-2.5 1.9-.7.2-1 1.2-1.9 1.2s-1.2-1-1.9-1.2c-1.1-.3-2.1-.7-2.5-1.9-.2-.7-.5-.9-1.2-1.1-1.1-.3-1.4-1.2-.4-1.7 1.3-.7 1.5-1.3 1.5-2.7C7.5 5.4 9 3 12 3z"/>',
        "whatsapp": '<path d="M20.5 3.5A11.7 11.7 0 0 0 2.1 17.6L.5 23.5l6.1-1.6A11.7 11.7 0 0 0 20.5 3.5zm-8.3 16.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-3.6 1 1-3.5-.2-.4a9 9 0 1 1 8.6 4.6zm5-6.7c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-2-.9-3.3-1.8-4.6-4-.3-.5.3-.5.8-1.5.1-.2.1-.4 0-.6l-1-2.4c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-1 1.1-1.2 2.3-.5 3.9 1.5 3.4 4.2 6 7.8 7.3 1.9.7 3.5.4 4.4-.8.4-.6.6-1.5.4-1.7-.1-.1-.3-.2-.6-.4z"/>',
        "threads": '<path d="M12 2c5.8 0 9.5 3.7 9.5 9.4 0 5.5-3.1 10.6-9.2 10.6-5.7 0-9.8-3.8-9.8-10 0-6 4-10 9.5-10zm.1 3.2c-3.6 0-6.1 2.6-6.1 6.8 0 4.1 2.5 6.7 6.3 6.7 3 0 5.2-1.6 5.6-4.4-.8 1.5-2.3 2.4-4.3 2.4-2.8 0-4.8-1.6-4.8-4 0-2.3 1.9-3.9 4.7-3.9 1.3 0 2.5.3 3.4.8-.7-2.9-2.3-4.4-4.8-4.4zm1.4 6.1c-1.1 0-1.8.5-1.8 1.4s.8 1.5 2 1.5c1.4 0 2.4-.8 2.8-2-.8-.6-1.8-.9-3-.9z"/>',
        "telegram": '<path d="m2 11 19-8-3 18-6-4-3 3v-5l9-8-11 7z"/>',
        "discord": '<path d="M6 5c4-2 8-2 12 0 2 3 3 7 3 11-2 2-4 3-6 3l-1-2 2-1c-3 1-5 1-8 0l2 1-1 2c-2 0-4-1-6-3 0-4 1-8 3-11zm3 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
        "twitch": '<path d="M4 2h18v13l-5 5h-4l-3 3v-3H4zm3 3v11h4v2l2-2h4l2-2V5zm4 3h2v5h-2zm5 0h2v5h-2z"/>',
        "bluesky": '<path d="M12 11c-1.1-2.2-4.1-6.3-6.8-8.2C2.6 1 .8 1.3.3 2.2c-.5.9-.3 7.4.8 8.5 1.1 1.1 3.7 1.5 5.3 1.2-2.8.5-5.3 1.8-2 5.4 3.6 3.7 5-1.4 5.6-3.7.2-.7.3-1 .5-1 .2 0 .3.3.5 1 .6 2.3 2 7.4 5.6 3.7 3.3-3.6.8-4.9-2-5.4 1.6.3 4.2-.1 5.3-1.2 1.1-1.1 1.3-7.6.8-8.5-.5-.9-2.3-1.2-4.9.6C16.1 4.7 13.1 8.8 12 11z"/>',
    }
    return f'<svg viewBox="0 0 24 24" aria-hidden="true">{paths.get(name, paths["x"])}</svg>'


def _confirmation_text(reign: dict) -> str:
    payment = reign.get("latestPayment") or {}
    source = payment.get("confirmedAt") or reign.get("startedAt") or ""
    try:
        confirmed = parse_iso(source)
        day = "today" if confirmed.date() == utc_now().date() else confirmed.strftime("%Y-%m-%d")
        return f"confirmed {day}, {confirmed.strftime('%H:%M')} utc"
    except (TypeError, ValueError):
        return "confirmed"


def _slot_meta(reign: dict, rank: int, kind: str) -> str:
    payment = reign.get("latestPayment") or {}
    amount = reign.get("totalConfirmed") or reign.get("initialAmount") or "0"
    defended = int(reign.get("defendCount", 0))
    defended_text = ""
    if defended == 1:
        defended_text = " · defended once"
    elif defended > 1:
        defended_text = f" · defended {defended} times"
    tx = f' · tx {escape(payment.get("shortTxid"))}' if payment.get("shortTxid") else ""
    return f'''<div class="wall-slot-meta"><span><span class="wall-rank">№ {rank}</span> · {escape(kind)}</span>
<span class="wall-slot-tail"><strong>{escape(amount)} USDT</strong>{defended_text}{tx} · {_confirmation_text(reign)}</span></div>'''


def _render_wall_slot(settings: Settings, reign: dict, rank: int, active_public_id: str = "") -> str:
    message = str(reign.get("message") or "")
    url = str(reign.get("url") or "")
    signature = str(reign.get("signature") or "").strip()
    tracked_url = f'/message/{escape(reign.get("slug"))}/go' if url and reign.get("slug") else url
    social = _social_profile(url) if url else None
    defend = ""
    if active_public_id and str(reign.get("publicId") or "") == active_public_id:
        defend = '<button class="wall-defend-button" type="button" data-open-dialog="defend-dialog">Back this message</button>'
    if social:
        name, _color, handle, host = social
        kind = f"social · {name}"
        meta = _slot_meta(reign, rank, kind)
        label = str(reign.get("ctaLabel") or f"{host}/{handle}")
        body = f'''<div class="wall-social-card">
  <div class="wall-social-icon">{_social_glass_icon(name)}</div>
  <div><h3>@{escape(handle)}{f' <span>· {escape(signature)}</span>' if signature else ''}</h3>
  <p>{escape(message)}</p><a class="wall-link-button wall-link-button--light" href="{tracked_url}" target="_blank" rel="noopener noreferrer">{escape(label)}</a>{defend}</div>
</div>'''
        return f'<article class="wall-slot wall-slot--social">{meta}{body}</article>'

    if url:
        parsed = urlsplit(url)
        host = (parsed.hostname or url).removeprefix("www.")
        hook = message.split(".", 1)[0].strip()
        if len(hook) < 18:
            hook = signature or host
        if len(hook) > 90:
            hook = hook[:87].rstrip() + "..."
        label = str(reign.get("ctaLabel") or host)
        meta = _slot_meta(reign, rank, "website")
        screenshot = '<img src="/assets/sreda-screenshot.png" alt="sreda.ink homepage screenshot">' if host == "sreda.ink" else f'<div class="wall-site-placeholder"><span>{escape(host)}</span><p>{escape(message[:160])}</p></div>'
        body = f'''<div class="wall-site-card"><div><h3>{escape(hook)}.</h3><p>{escape(message)}</p>
  <a class="wall-link-button" href="{tracked_url}" target="_blank" rel="noopener noreferrer">{escape(label)}</a>{defend}</div>
  <a class="wall-browser" href="{tracked_url}" target="_blank" rel="noopener noreferrer" aria-label="Open {escape(host)}">
    <span class="wall-browser-bar"><i></i><i></i><i></i><span><b aria-hidden="true">{escape(host[:1].upper())}</b>{escape(host)}</span></span>{screenshot}
  </a></div>'''
        return f'<article class="wall-slot wall-slot--site">{meta}{body}</article>'

    meta = _slot_meta(reign, rank, "message")
    paragraphs = "".join(f"<p>{escape(part)}</p>" for part in message.split("\n\n") if part.strip()) or f"<p>{escape(message)}</p>"
    body = f'''<div class="wall-message-card"><div class="wall-message-copy">{paragraphs}</div>{defend}</div>'''
    return f'<article class="wall-slot wall-slot--message">{meta}{body}</article>'


def _wall_time_label(slot: dict) -> str:
    location = str(slot.get("location") or "")
    if location and location not in {name for name, _label in SOCIAL_PICKER}:
        return location
    try:
        started = parse_iso(str(slot.get("startedAt") or ""))
        day = "сегодня" if started.date() == utc_now().date() else started.strftime("%Y-%m-%d")
        return f"{day}, {started.strftime('%H:%M')} UTC"
    except (TypeError, ValueError):
        return "сегодня"


def _wall_action(slot: dict, kind: str) -> str:
    slot_number = int(slot["slotNumber"])
    labels = {"website": "сайт", "social": "соцсеть", "message": "сообщение"}
    return f'''<div class="slot-action">
          <a class="outbid-button" href="/takeover?slot={slot_number}" data-outbid data-slot="{slot_number}">Занять место: {escape(labels[kind])} · <span data-outbid-price>{escape(slot["outbidAmount"])}</span> USDT</a>
        </div>'''


def _wall_meta(slot: dict, kind: str) -> str:
    return f'''<div class="slot-line">
        <span><span class="slot-number">№ {int(slot["slotNumber"])}</span> · {kind}</span>
        <span class="slot-price"><span data-current-price>{escape(slot["amount"])}</span> USDT<span class="date"> · на стене: {_wall_time_label(slot)}</span></span>
      </div>'''


def _wall_paragraphs(value: object) -> str:
    return "".join(f"<p>{escape(part.strip())}</p>" for part in str(value or "").split("\n\n") if part.strip())


def _wall_site_slot(slot: dict) -> str:
    url = str(slot.get("url") or "")
    host = (urlsplit(url).hostname or "website").removeprefix("www.")
    slug = str(slot.get("slug"))
    seed = slug == "pen-dev-wall-seed"
    owner_seed = slug == "owner-website-20260901"
    headline = "Draw it. Ship the code." if seed else str(slot.get("signature") or "").strip()
    if not headline:
        headline = str(slot.get("message") or "").split(".", 1)[0].strip()
        headline = (headline[:76].rstrip() + ("…" if len(headline) > 76 else "")) or host
    screenshot_url = str(slot.get("screenshotUrl") or "")
    screenshot = '''<div class="shot" aria-hidden="true">
          <div class="shot-chrome"><i></i><i></i><i></i><span class="shot-url">https://www.pen.dev</span></div>
          <img src="/assets/pen-screenshot.png" alt="" width="1600" height="1050">
        </div>''' if seed else ('''<div class="shot" aria-hidden="true">
          <div class="shot-chrome"><i></i><i></i><i></i><span class="shot-url">https://coin.im</span></div>
          <img src="/assets/coin-im-wall-screenshot.webp" alt="" width="1600" height="1050">
        </div>''' if owner_seed else (
        f'''<div class="shot" aria-hidden="true"><div class="shot-chrome"><i></i><i></i><i></i><span class="shot-url">{escape(host)}</span></div>
          <img src="{escape(screenshot_url)}" alt="" width="1600" height="1050"></div>'''
        if screenshot_url else f'''<div class="shot site-placeholder" aria-hidden="true"><span>{escape(host)}</span></div>'''
    ))
    favicon_url = "/assets/favicon-32.png" if owner_seed else str(slot.get("faviconUrl") or "")
    favicon = f'<img class="site-favicon" src="{escape(favicon_url)}" alt="" width="32" height="32">' if favicon_url else ""
    label = str(slot.get("ctaLabel") or host)
    return f'''<article class="slot site" data-wall-slot="1" data-current-price-micro="{int(slot["amountMicro"])}">
      {_wall_meta(slot, "website")}
      <div class="block">
        <a class="card-hit" href="{escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть {escape(host)}"></a>
        <div class="site-copy">
          <div class="site-title-row">{favicon}<h2>{escape(headline)}</h2></div>
          <div class="copy">{_wall_paragraphs(slot["message"])}</div>
          <a class="go" href="{escape(url)}" target="_blank" rel="noopener noreferrer">{escape(label)}</a>
        </div>
        {screenshot}
        {_wall_action(slot, "website")}
      </div>
    </article>'''


def _wall_social_slot(slot: dict) -> str:
    url = str(slot.get("url") or "")
    profile = _social_profile(url)
    network, _color, handle, host = profile or ("social", "#141414", "profile", urlsplit(url).hostname or "social profile")
    display_handle = handle if handle.startswith("@") else f"@{handle}"
    message = _wall_paragraphs(slot["message"])
    followers = f' <span>· {escape(slot["signature"])}</span>' if slot.get("signature") else ""
    label = str(slot.get("ctaLabel") or f"{host}/{handle}")
    return f'''<article class="slot social" data-wall-slot="2" data-current-price-micro="{int(slot["amountMicro"])}">
      {_wall_meta(slot, f"social · {network}")}
      <div class="block">
        <a class="card-hit" href="{escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть профиль {escape(network)}"></a>
        <div class="x-tile social-glass-icon social-glass-icon--{escape(network)}" aria-hidden="true"></div>
        <div class="social-copy">
          <h2>{escape(display_handle)}{followers}</h2>
          <div class="copy">{message}</div>
          <a class="go" href="{escape(url)}" target="_blank" rel="noopener noreferrer">{escape(label)}</a>
        </div>
        {_wall_action(slot, "social")}
      </div>
    </article>'''


def _wall_message_slot(slot: dict) -> str:
    message = str(slot.get("message") or "").strip()
    if str(slot.get("slug")) == "on-silence-wall-seed":
        title = "On silence."
        body_message = message
    elif str(slot.get("slug")) == "owner-message-20260901":
        title = "Просто сообщение"
        body_message = message
    else:
        opening = re.match(r"^(.{1,120}?[.!?])(?:\s+|$)(.*)$", message, flags=re.DOTALL)
        title = opening.group(1).strip() if opening else ""
        body_message = opening.group(2).strip() if opening else message
    paragraphs = [part.strip() for part in body_message.split("\n\n") if part.strip()]
    title_html = f"<h2>{escape(title)}</h2>" if title else ""
    body = "".join(f"<p>{escape(part)}</p>" for part in paragraphs)
    return f'''<article class="slot message" data-wall-slot="3" data-current-price-micro="{int(slot["amountMicro"])}">
      {_wall_meta(slot, "message")}
      <div class="block">
        {title_html}
        <div class="message-body">{body}</div>
        {_wall_action(slot, "message")}
      </div>
    </article>'''


def render_home(settings: Settings, state: dict, archive: Optional[dict] = None) -> str:
    del settings, archive
    source = Path(__file__).with_name("home.html").read_text(encoding="utf-8")
    slots = state.get("slots") or []
    if len(slots) != 3:
        return source
    renderers = (_wall_site_slot, _wall_social_slot, _wall_message_slot)
    for slot, renderer in zip(slots, renderers):
        slot_number = int(slot["slotNumber"])
        pattern = rf"<!-- wall-slot-{slot_number}:start -->.*?<!-- wall-slot-{slot_number}:end -->"
        replacement = f"<!-- wall-slot-{slot_number}:start -->\n    {renderer(slot)}\n    <!-- wall-slot-{slot_number}:end -->"
        source = re.sub(pattern, replacement, source, flags=re.DOTALL)
    source = re.sub(r'(<span data-wall-total>).*?(</span>)', rf'\g<1>{escape(state["total"])}\2', source, count=1)
    return source


def render_home_take_dialog(state: dict) -> str:
    price = escape(state["takeoverPrice"])
    return f"""<dialog id="take-dialog" class="composer-dialog"><button type="button" class="dialog-close" data-close-dialog aria-label="Close">×</button>
<form data-takeover-form data-kind="takeover" data-current-reign="{escape(state.get('currentReignPublicId', ''))}" data-price-micro="{int(state['takeoverPriceMicro'])}">
<div class="composer-fields"><p>Take over coin.im</p><label>Message<textarea name="message" required data-message-input></textarea></label><p><span data-grapheme-count>0</span> / 888 characters without spaces</p>
<label>Name <span>optional</span><input name="signature" maxlength="80"></label><label>URL <span>optional</span><input name="url" type="url" placeholder="https://"></label>
<label>USDT amount<input name="customAmount" type="number" inputmode="decimal" min="{price}" step="1" value="{price}" required></label><input type="hidden" name="amountChoice" value="custom"></div>
<div class="composer-preview"><p>Final preview</p><blockquote data-message-preview>Your message will appear here.</blockquote><p data-preview-name></p><p>You are paying <span data-preview-amount>{price}</span> USDT on TRON (TRC-20).</p><small>Your text, name and URL become final after confirmation. A higher confirmed payment can replace the active placement.</small></div>
<p class="form-error" data-form-error role="alert"></p><button class="take-page" type="submit">Continue to USDT payment</button></form></dialog>"""


def render_home_defend_dialog(state: dict) -> str:
    return f"""<dialog id="defend-dialog" class="market-sheet"><button type="button" class="dialog-close" data-close-dialog aria-label="Close">×</button><h2>Back this message</h2>
<form data-takeover-form data-kind="defend" data-current-reign="{escape(state.get('currentReignPublicId', ''))}" data-price-micro="{int(state['takeoverPriceMicro'])}"><fieldset class="coin-options"><legend>Add backing</legend>
{''.join(f'<label><input type="radio" name="amountChoice" value="{amount}"{(" checked" if amount == 1 else "")}>+{amount}</label>' for amount in (1,5,10,50))}<label><input type="radio" name="amountChoice" value="custom">Custom <input name="customAmount" type="number" min="1" step="1" inputmode="numeric"></label></fieldset>
<p>Payment uses USDT on TRON (TRC-20). Your confirmed payment raises this message's live backing, then gradually decays.</p><p class="form-error" data-form-error role="alert"></p><button class="take-page" type="submit">Continue to USDT payment</button></form></dialog>"""


def render_wall_picker(settings: Settings, wall_state: dict) -> str:
    slots = wall_state["slots"]
    choices = (
        (1, "website", "Website", "Paste the link and text. We add the title, favicon and screenshot automatically."),
        (2, "social", "Social profile", "Choose a network. Add your profile link and 100 to 888 characters."),
        (3, "message", "Message", "Publish 100 to 888 characters. No link needed."),
    )
    cards = []
    for slot_number, kind_name, title, description in choices:
        slot = slots[slot_number - 1]
        if slot_number == 1:
            icon = '<span class="type-choice-icon type-choice-icon--website" aria-hidden="true"><i></i></span>'
        elif slot_number == 2:
            icon = f'<span class="type-choice-icon type-choice-icon--social" aria-hidden="true">{_social_glass_icon("instagram")}{_social_glass_icon("x")}{_social_glass_icon("tiktok")}</span>'
        else:
            icon = '<span class="type-choice-icon type-choice-icon--message" aria-hidden="true"><i></i></span>'
        cards.append(f'''<a class="placement-choice placement-choice--{kind_name}" href="/takeover?slot={slot_number}">
      {icon}<span class="placement-choice-copy"><strong>{escape(title)}</strong><span>{escape(description)}</span></span>
      <span class="placement-choice-price">{escape(slot["outbidAmount"])} USDT</span>
    </a>''')
    body = f"""{header()}
<main id="main-content" class="slot-picker-page">
  <header><h1>What do you want to publish?</h1><p>Choose one. You fill the form before you pay.</p></header>
  <div class="placement-choices">{''.join(cards)}</div>
</main>{footer()}"""
    return page_shell(
        settings,
        "Publish on coin.im",
        "Choose a website, social profile or message, then pay in USDT on TRON.",
        body,
        canonical_path="/takeover",
        noindex=True,
    )


def render_takeover(
    settings: Settings,
    state: dict,
    kind: str = "takeover",
    return_message: Optional[dict] = None,
    wall_slot: Optional[dict] = None,
    wall_state: Optional[dict] = None,
) -> str:
    if not state["marketEnabled"]:
        body = f"""{header()}
<main id="main-content" class="narrow-page"><h1>Payments are closed.</h1>
<p>coin.im cannot create a payment receipt right now.</p>
<a class="market-button market-button--quiet" href="/message">Return to the message wall</a></main>{footer()}"""
        return page_shell(settings, "Payments are not open: coin.im", "The coin.im market is not accepting payments yet.", body, canonical_path="/takeover", noindex=True)
    if wall_slot is not None:
        slot_number = int(wall_slot["slotNumber"])
        slot_kind = {1: "website", 2: "social profile", 3: "message"}[slot_number]
        price = escape(wall_slot["outbidAmount"])
        prices = {
            int(item["slotNumber"]): escape(item["outbidAmount"])
            for item in ((wall_state or {}).get("slots") or [wall_slot])
        }
        switcher_parts = []
        for number, label in ((1, "Website"), (2, "Social"), (3, "Message")):
            current = ' aria-current="page"' if number == slot_number else ""
            switcher_parts.append(
                f'''<a class="publish-type-tab" href="/takeover?slot={number}"{current}>
  <span class="publish-type-icon publish-type-icon--{number}" aria-hidden="true"></span>
  <span><strong>{label}</strong><small>{prices.get(number, "")} USDT</small></span>
</a>'''
            )
        switcher = "".join(switcher_parts)
        if return_message:
            message_fields = f'''<input type="hidden" name="targetMessageSlug" value="{escape(return_message['slug'])}">
    <input type="hidden" name="signature" value="{escape(return_message.get('signature', ''))}">
    <input type="hidden" name="url" value="{escape(return_message.get('url', ''))}">
    <input type="hidden" name="ctaLabel" value="{escape(return_message.get('cta_label', ''))}">
    <label class="form-field"><span class="field-label">Archived content</span><textarea name="message" readonly dir="auto" data-message-input>{escape(return_message['message'])}</textarea></label>'''
        elif slot_number == 1:
            message_fields = '''<label class="form-field"><span class="field-label">Website link</span><input name="url" type="text" inputmode="url" autocomplete="url" placeholder="yourwebsite.com" required data-website-url><span class="field-help">The title, favicon and a fresh first-screen screenshot are added automatically.</span></label>
    <label class="form-field"><span class="field-label-line"><span>Website text</span><span><span data-grapheme-count>0</span> / 888</span></span><textarea name="message" required dir="auto" data-message-input aria-describedby="message-help" placeholder="Why should someone open this website?"></textarea><span id="message-help" class="field-help">Minimum 100 characters without spaces.</span></label>'''
        elif slot_number == 2:
            message_fields = f'''<fieldset class="social-picker" aria-describedby="social-picker-help"><legend>Social network</legend><p id="social-picker-help" class="field-help">Paste the profile link and it selects itself, or tap an icon.</p><div class="social-options">{_social_picker()}</div></fieldset>
    <label class="form-field"><span class="field-label">Profile link</span><input name="url" type="url" inputmode="url" autocomplete="url" placeholder="https://" required data-social-url></label>
    <label class="form-field"><span class="field-label-line"><span>Profile text</span><span><span data-grapheme-count>0</span> / 888</span></span><textarea name="message" required dir="auto" data-message-input aria-describedby="message-help" placeholder="Why should someone open this profile?"></textarea><span id="message-help" class="field-help">Minimum 100 characters without spaces.</span></label>'''
        else:
            message_fields = '''<label class="form-field"><span class="field-label-line"><span>Your message</span><span><span data-grapheme-count>0</span> / 888</span></span><textarea name="message" required dir="auto" data-message-input aria-describedby="message-help" placeholder="Write exactly what should stay on coin.im."></textarea><span id="message-help" class="field-help">Minimum 100 characters without spaces. No name. No link.</span></label>'''
        headings = {
            1: ("Put your website here.", "Paste the link. Write the text. We do the rest."),
            2: ("Put your profile here.", "Choose the network, paste the profile link, and write the text."),
            3: ("Put your words here.", "Just the message. No name. No link."),
        }
        heading, intro = headings[slot_number]
        body = f"""{header()}
<main id="main-content" class="checkout-page checkout-page--slot-{slot_number} publish-page">
  <nav class="publish-type-switcher" aria-label="What do you want to publish?">{switcher}</nav>
  <section class="publish-form-shell">
    <header class="publish-form-header">
      <div><h1>{heading}</h1><p>{intro}</p></div>
      <div class="publish-price"><span>You pay</span><strong>{price} USDT</strong></div>
    </header>
    <form class="takeover-form takeover-form--slot-{slot_number}" data-takeover-form data-kind="takeover" data-wall-slot="{slot_number}" data-current-reign="{escape(wall_slot['publicId'])}" data-price-micro="{int(wall_slot['outbidAmountMicro'])}">
      {message_fields}
      <input type="hidden" name="amountChoice" value="custom"><input type="hidden" name="customAmount" value="{price}">
      <p class="form-error" data-form-error role="alert" aria-live="assertive"></p>
      <button class="market-button publish-submit" type="submit">Continue to payment <span>{price} USDT</span></button>
      <p class="submit-help">The 7-minute payment window starts next. Nothing is published until payment is confirmed.</p>
    </form>
  </section>
</main>{footer()}"""
        return page_shell(settings, f"Publish your {slot_kind}: coin.im", f"Replace the {slot_kind} place for {price} USDT.", body, canonical_path="/takeover", noindex=True)
    if kind == "defend":
        return render_defend(settings, state)
    message = state.get("message")
    if state["state"] not in {"unclaimed", "open"}:
        body = f"""{header()}<main id="main-content" class="narrow-page">
<p class="takeover-kicker">LIVE TAKEOVER</p><h1>A takeover cannot start right now.</h1>
<p>Return to the message wall for the current live state.</p><a class="market-button" href="/message">View the live message wall</a></main>{footer()}"""
        return page_shell(settings, "Takeover unavailable: coin.im", "The current coin.im takeover state.", body, canonical_path="/takeover", noindex=True)
    if return_message:
        message_fields = f"""<input type="hidden" name="targetMessageSlug" value="{escape(return_message['slug'])}">
    <label>Your message<textarea name="message" readonly dir="auto" data-message-input aria-describedby="message-help">{escape(return_message['message'])}</textarea></label>
    <p id="message-help" class="field-help">This published message is immutable. A new payment creates a new reign, not a new version.</p>"""
        takeover_heading = "Take the page back."
    else:
        message_fields = """<label>Your message<textarea name="message" required dir="auto" data-message-input aria-describedby="message-help"></textarea></label>
    <p id="message-help" class="field-help"><span data-grapheme-count>0</span> / 888 characters without spaces</p>
    <label>Name <span>optional</span><input name="signature" maxlength="80" dir="auto"></label>
    <label>URL <span>optional</span><input name="url" type="url" inputmode="url" placeholder="https://"></label>"""
        takeover_heading = "Put your message on the wall."
    body = f"""{header()}
<main id="main-content" class="checkout-page">
  <section class="checkout-copy">
    <p class="takeover-kicker">TAKE THE PAGE</p>
    <h1>{takeover_heading}</h1>
    <p>Keep it short. Make it worth the whole page.</p>
    <div class="checkout-price"><span>Current takeover price</span><strong>{escape(state['takeoverPrice'])} USDT</strong><small>Payment uses USDT on TRON (TRC-20).</small></div>
    <p>Your placement stays on the wall until a higher payment replaces it.</p>
    <p>A higher confirmed payment can replace your message immediately.</p>
  </section>
  <form class="takeover-form" data-takeover-form data-kind="takeover" data-current-reign="{escape(state.get('currentReignPublicId', ''))}" data-price-micro="{int(state['takeoverPriceMicro'])}">
    {message_fields}
    <fieldset class="amount-choice"><legend>Amount</legend>
      <label><input type="radio" name="amountChoice" value="minimum" checked>Minimum: {escape(state['takeoverPrice'])} USDT</label>
      <label><input type="radio" name="amountChoice" value="stronger">Stronger: {escape(stronger_amount(state['takeoverPriceMicro'], 50))} USDT</label>
      <label><input type="radio" name="amountChoice" value="custom">Custom amount <input name="customAmount" inputmode="decimal" placeholder="USDT"></label>
    </fieldset>
    <p class="field-help">Anything above the minimum makes your message harder to replace.</p>
    <div class="message-preview" aria-live="polite"><span>LIVE PREVIEW</span><p dir="auto" data-message-preview>Your message will appear here.</p></div>
    <p class="form-error" data-form-error role="alert"></p>
    <button class="market-button" type="submit">Continue to payment</button>
  </form>
</main>{footer()}"""
    return page_shell(settings, "Take the page: coin.im", "Write one message and pay the live takeover price.", body, canonical_path="/takeover", noindex=True)


def stronger_amount(minimum_micro: int, target_usdt: int) -> str:
    return format_usdt(max(minimum_micro + 25 * 1_000_000, target_usdt * 1_000_000))


def render_defend(settings: Settings, state: dict) -> str:
    message = state.get("message")
    if not message or state["state"] in {"quote_active", "payment_found", "incoming"}:
        return render_takeover(settings, {**state, "marketEnabled": False}, "takeover")
    body = f"""{header()}
<main id="main-content" class="checkout-page checkout-page--defend">
  <section class="checkout-copy">
    <p class="takeover-kicker">KEEP THIS MESSAGE LIVE</p>
    <h1 dir="auto">{escape(message['message'])}</h1>
    <p>Every confirmed USDT raises the change price for exactly 24 hours.</p>
    <div class="checkout-price"><span>Current takeover price</span><strong>{escape(state['takeoverPrice'])} USDT</strong><small>Payment uses USDT on TRON (TRC-20).</small></div>
  </section>
  <form class="takeover-form" data-takeover-form data-kind="defend" data-current-reign="{escape(state['currentReignPublicId'])}" data-price-micro="{int(state['takeoverPriceMicro'])}">
    <fieldset class="amount-choice"><legend>Add backing</legend>
      <label><input type="radio" name="amountChoice" value="5" checked>5 USDT</label>
      <label><input type="radio" name="amountChoice" value="10">10 USDT</label>
      <label><input type="radio" name="amountChoice" value="25">25 USDT</label>
      <label><input type="radio" name="amountChoice" value="100">100 USDT</label>
      <label><input type="radio" name="amountChoice" value="custom">Custom amount <input name="customAmount" inputmode="decimal" placeholder="USDT"></label>
    </fieldset>
    <div class="defend-preview"><span>Current takeover price: {escape(state['takeoverPrice'])} USDT</span>
      <p>Final strength and takeover price are calculated by the server after confirmation.</p></div>
    <p class="form-error" data-form-error role="alert"></p>
    <button class="market-button" type="submit">Continue to payment</button>
  </form>
</main>{footer()}"""
    return page_shell(settings, "Keep this message live: coin.im", "Add confirmed backing to the current message.", body, canonical_path="/takeover", noindex=True)


def render_receipt(settings: Settings, receipt: dict, token: str) -> str:
    status = receipt["status"]
    wall_slot_number = receipt.get("wallSlotNumber")
    wall_kind = {1: "website", 2: "social profile", 3: "message"}.get(wall_slot_number, "")
    receipt_type = f"Slot № {wall_slot_number}, {wall_kind}" if wall_slot_number else receipt["kind"]
    receipt_context = (
        f"Keep this link. A confirmed payment puts your {wall_kind} in slot № {wall_slot_number}."
        if wall_slot_number
        else "Keep this link. It is your payment record."
    )
    status_copy = {
        "created": "Waiting for payment",
        "payment_found": "Payment detected",
        "confirmed": "Payment confirmed",
        "expired": "Payment expired",
        "underpaid": "Payment is too small",
        "requires_review": "Payment needs review",
        "credited": "Payment saved as credit",
        "failed": "Payment could not be verified",
        "cancelled": "Payment cancelled",
    }.get(status, status.replace("_", " ").title())
    address = receipt.get("receivingAddress") or ""
    contract = receipt.get("contractAddress") or ""
    amount = receipt["amount"]
    request_url = payment_request_url(settings.site_url, token, address, amount, contract) if address and contract else ""
    wallet_url = tronlink_open_dapp_uri(request_url) if request_url else ""
    callback_url = f"{settings.site_url}/api/market/receipt/{token}/tronlink-callback"
    progress = ""
    progress_index = {"created": 0, "payment_found": 1, "confirmed": 2}.get(status)
    if progress_index is not None:
        steps = []
        for index, label in enumerate(("Waiting", "Detected", "Confirmed")):
            step_class = " is-complete" if index < progress_index else ""
            current = ' aria-current="step"' if index == progress_index else ""
            steps.append(f'<li class="payment-step{step_class}"{current}><span></span>{label}</li>')
        progress = f'<ol class="payment-progress" aria-label="Payment status">{"".join(steps)}</ol>'
    payment_block = ""
    payment_recovery = f"""<details class="payment-recovery"><summary>Can't see your payment?</summary>
    <form data-verify-payment data-receipt-token="{escape(token)}">
      <label>TRON transaction ID<input name="txid" autocomplete="off" minlength="64" maxlength="64" spellcheck="false" required></label>
      <p class="field-help">Paste the 64-character transaction ID.</p>
      <p class="form-error" data-form-error role="alert"></p>
      <button class="market-button market-button--quiet" type="submit">Check transaction</button>
    </form>
  </details>"""
    if status in {"created", "payment_found"} and address:
        payment_effect = (
            f"Confirmation puts your {wall_kind} in slot № {wall_slot_number} and moves the old placement to Archive."
            if wall_slot_number
            else "Confirmation applies the payment automatically."
        )
        payment_block = f"""<section class="payment-instructions">
  <div class="payment-amount"><span>Send exactly</span><strong>{escape(amount)} USDT</strong><small>{escape(amount)} USDT · TRON (TRC-20)</small></div>
  <p class="payment-effect">{escape(payment_effect)}</p>
  <a class="market-button wallet-open" href="{escape(wallet_url)}" data-open-wallet>Pay in TronLink</a>
  <p class="wallet-status" data-wallet-status role="status">You approve {escape(amount)} USDT in your wallet.</p>
  <div class="payment-qr" data-qr-value="{escape(request_url)}" aria-label="QR code for this exact USDT payment"></div>
  <p class="payment-qr-help">Or scan the QR with your phone.</p>
  <label>Receiving address<input readonly value="{escape(address)}"><button type="button" data-copy-value="{escape(address)}">Copy address</button></label>
  <label>Amount<input readonly value="{escape(amount)}"><button type="button" data-copy-value="{escape(amount)}">Copy amount</button></label>
  <p class="field-help">We check TRON automatically. Keep this page open.</p>
  {payment_recovery}
</section>"""
    elif status == "expired" and address:
        payment_block = f"""<section class="receipt-result expired-payment-recovery">
  <h2>Already paid?</h2>
  <p>Do not pay this expired receipt again. Paste the transaction ID from the payment you already sent.</p>
  {payment_recovery}
</section>"""
    result_block = ""
    if receipt.get("credit"):
        credit = receipt["credit"]
        result_block += f'<section class="receipt-result"><h2>{escape(credit["amount"])} USDT saved</h2><p>The place changed before this payment could take it. The confirmed amount stays attached to this receipt for review.</p></section>'
    if receipt.get("result"):
        result = receipt["result"]
        snapshot = result["snapshot"]
        if result["type"] == "takeover":
            if snapshot.get("wallSlotNumber"):
                headline = f"Slot № {int(snapshot['wallSlotNumber'])} is yours."
                detail = "Your placement is live on coin.im."
            else:
                headline = "coin.im is yours."
                detail = "Your message is now the only message on the page."
            verified = f"{escape(snapshot.get('amount'))} USDT verified on-chain"
        else:
            headline = "The message stays."
            detail = f"The next price moved from {escape(snapshot.get('takeoverPriceBefore'))} to {escape(snapshot.get('takeoverPriceAfter'))} USDT."
            verified = f"{escape(snapshot.get('amount'))} USDT verified"
        wall_result = bool(snapshot.get("wallSlotNumber"))
        secondary_actions = (
            f'<a href="/m/{escape(snapshot.get("reignPublicId"))}">Permanent message page</a>'
            if wall_result
            else f'''<a class="market-button market-button--quiet" href="/takeover?kind=defend&amp;reign={escape(snapshot.get('reignPublicId'))}">{'Back my message' if result['type'] == 'takeover' else 'Keep it live'}</a>
  <a href="/badge/reign/{escape(snapshot.get('reignPublicId'))}.svg">Live badge</a>
  <a href="/m/{escape(snapshot.get('reignPublicId'))}">Permanent message page</a>'''
        )
        result_block = f"""<section class="receipt-result">
  <h2>{headline}</h2><p>{detail}</p>
  <p>{verified}</p>
  <div class="result-actions"><button class="market-button" type="button" data-share-result data-share-type="{escape(result['type'])}" data-share-text="I took over coin.im.&#10;My message stays until someone pays more." data-share-url="{escape(result['shareUrl'])}">{'Share my place' if wall_result else ('Share my takeover' if result['type'] == 'takeover' else 'Share')}</button>
  <a href="/message">View the live message wall</a>
  {secondary_actions}</div>
  {f'''<form class="replacement-notice" data-replacement-notice><label>Tell me when I’m replaced<input name="contact" placeholder="Email or Telegram chat ID" required></label><p class="field-help">One message. No account.</p><p class="form-error" data-form-error role="alert"></p><button class="market-button market-button--quiet" type="submit">Notify me</button></form>''' if result['type'] == 'takeover' and receipt.get('notificationChannels') else ''}
</section>"""
    body = f"""{header()}
<main id="main-content" class="receipt-page" data-receipt-status="{escape(status)}" data-receipt-token="{escape(token)}" data-payment-url="{escape(request_url)}" data-callback-url="{escape(callback_url)}" data-receiving-address="{escape(address)}" data-contract-address="{escape(contract)}" data-amount="{escape(amount)}" data-amount-micro="{int(receipt['amountMicro'])}">
  <h1>{escape(status_copy)}</h1>
  <p class="receipt-private">{escape(receipt_context)}</p>
  {progress}
  <dl><div><dt>Placement</dt><dd>{escape(receipt_type)}</dd></div><div><dt>Exact amount</dt><dd>{escape(receipt['amount'])} USDT</dd></div>
  <div><dt>Network</dt><dd>{escape(receipt['network'])}</dd></div></dl>
  {payment_block}{result_block}
</main>{footer()}"""
    return page_shell(settings, "Private receipt: coin.im", "Private payment status for coin.im.", body, canonical_path="/receipt", noindex=True, page_class="market-page receipt-document")


def render_reign(settings: Settings, reign: dict) -> str:
    signature = f'<p class="takeover-signature">{escape(reign["signature"])}</p>' if reign.get("signature") else ""
    location = f'<p class="takeover-location">{escape(reign["location"])}</p>' if reign.get("location") else ""
    ledger = "".join(
        f"""<li><span>{escape(item['type'])}</span><strong>{escape(item['amount'])} USDT</strong>
<a href="https://tronscan.org/#/transaction/{escape(item['txid'])}" rel="noopener noreferrer">{escape(item['shortTxid'])}</a>
<time>{escape(item['confirmedAt'])}</time></li>"""
        for item in reign["ledger"]
    )
    status = "Live on coin.im" if reign["status"] == "active" else "This message held coin.im"
    slot_query = f'slot={int(reign["wallSlotNumber"])}&amp;' if reign.get("wallSlotNumber") else ""
    bring_back = "" if reign["status"] == "active" else f'<a class="market-button market-button--quiet" href="/takeover?{slot_query}message={escape(reign["slug"])}">Take it back: {escape(reign.get("currentTakeoverPrice", "1"))} USDT</a>'
    impact = ""
    if reign["status"] != "active":
        facts = [escape(reign['duration'])]
        if reign["verifiedReaders"]:
            facts.append(f"{int(reign['verifiedReaders']):,} verified readers")
        if reign["countries"]:
            facts.append(f"{int(reign['countries']):,} countries")
        if reign["outboundClicks"]:
            facts.append(f"{int(reign['outboundClicks']):,} outbound clicks")
        impact = f'<p class="reign-impact">{" · ".join(facts)}</p>'
    replaced_by = f'<p>Replaced by <a href="/m/{escape(reign["replacedByPublicId"])}">the next message</a>.</p>' if reign.get("replacedByPublicId") else ""
    if reign.get("completedShareUrl"):
        share = f'<button class="market-button" type="button" data-share-result data-share-type="completed" data-share-text="We held coin.im for {escape(reign["duration"])}." data-share-url="{escape(reign["completedShareUrl"])}">Share</button>'
    else:
        share = '<button class="market-button" type="button" data-share-current>Share</button>'
    body = f"""{header()}
<main id="main-content" class="reign-page">
  <p class="takeover-kicker">{status}</p><h1 dir="auto">{escape(reign['message'])}</h1>{signature}{location}{impact}{replaced_by}
  <dl class="reign-summary"><div><dt>Time on the page</dt><dd>{escape(reign['duration'])}</dd></div>
  <div><dt>Takeover</dt><dd>{escape(reign['initialAmount'])} USDT</dd></div>
  <div><dt>Total backing paid</dt><dd>{escape(reign['totalConfirmed'])} USDT</dd></div>
  <div><dt>Backers</dt><dd>{int(reign.get('backers', 0)):,}</dd></div></dl>
  <div class="reign-actions">{share}{bring_back}
  <a href="/badge/reign/{escape(reign['reignId'])}.svg">Badge</a><a href="/reign/{escape(reign['reignId'])}/poster">QR poster</a></div>
  <section class="ledger"><h2>Verified on-chain</h2><ul>{ledger or '<li>No confirmed ledger entries.</li>'}</ul></section>
</main>{footer()}"""
    return page_shell(settings, f"{status}: coin.im", reign["message"][:150], body, canonical_path=f"/m/{reign['reignId']}")


def render_archive(settings: Settings, archive: dict) -> str:
    items = []
    for reign in archive["reigns"]:
        details = [f"{escape(reign['duration'])} live", f"{escape(reign['initialAmount'])} USDT takeover"]
        if reign["verifiedReaders"]:
            details.append(f"{int(reign['verifiedReaders']):,} verified readers")
        items.append(f"""<article><a href="/m/{escape(reign['publicId'])}"><h2 dir="auto">{escape(reign['message'])}</h2></a>
<p>{' · '.join(details)}</p><span>{escape(reign['status'])}</span></article>""")
    records = ""
    if archive["records"]:
        labels = {"longest": "Longest reign", "highestTakeover": "Highest takeover", "mostDefended": "Most defended", "mostRead": "Most read"}
        records = '<section class="records"><h2>Records</h2><ul>' + "".join(
            f'<li><span>{labels[key]}: {escape(value["value"])}</span><a href="/m/{escape(value["publicId"])}">View reign</a></li>'
            for key, value in archive["records"].items()
        ) + "</ul></section>"
    empty = '<p class="empty-state">No reign has been confirmed yet.</p>'
    body = f"""{header('/archive')}<main id="main-content" class="archive-page">
<h1>The messages that were here before.</h1>{records}
<section class="archive-list">{''.join(items) if items else empty}</section></main>{footer()}"""
    return page_shell(settings, "Public archive: coin.im", "The permanent archive of messages that held the coin.im homepage.", body, canonical_path="/archive")


def render_stats(settings: Settings, stats: dict) -> str:
    values = [
        ("Paid slots on the wall", stats["paidSlots"]),
        ("Current wall total", stats["currentWallTotal"] + " USDT"),
        ("Next outbids", " / ".join(stats["nextOutbids"]) + " USDT"),
        ("Unique visitors", stats["uniqueVisitors"]),
        ("Verified readers", stats["verifiedReaders"]),
        ("Outbound clicks", stats["outboundClicks"]),
        ("Confirmed outbids", stats["takeovers"]),
        ("Verified payments", stats["verifiedUsdt"] + " USDT"),
        ("Countries", stats["countries"]),
    ]
    cards = "".join(f'<div><dt>{escape(label)}</dt><dd>{escape(value)}</dd></div>' for label, value in values)
    body = f"""{header('/stats')}<main id="main-content" class="stats-page">
<h1>What coin.im measured.</h1>
<nav class="periods" aria-label="Stats period"><a href="/stats?period=24h">24 hours</a><a href="/stats?period=7d">7 days</a><a href="/stats?period=all">All time</a></nav>
<dl>{cards}</dl><p>These are first-party events from coin.im. Preview bots and known crawlers are excluded.</p></main>{footer()}"""
    return page_shell(settings, "Public stats: coin.im", "Measured coin.im visitors, readers, payments and reigns.", body, canonical_path="/stats")


RULES = [
    "coin.im has 3 occupied places: website, social profile and message.",
    "To take a place, pay exactly 1 USDT more than its current price.",
    "Slot № 1 needs a headline, description and public website URL.",
    "Slot № 2 needs a pitch and public social profile URL. A short note is optional.",
    "Slot № 3 needs text. A name is optional, and the place has no public link.",
    "The form creates a private receipt and charges nothing. It holds the price for 7 minutes.",
    "The receipt contains the exact USDT amount, TRON address, QR code and TronLink payment.",
    "The selected place changes after final on-chain confirmation. The old placement moves to Archive. The other 2 stay unchanged.",
    "Payments buy visibility on coin.im. The money does not go to the author of the placement.",
    "Visibility does not guarantee readers, clicks, customers or revenue.",
    "Messages containing threats, doxxing, impersonation, phishing, malware, illegal sales or clearly unlawful material may be hidden.",
    "Publication on coin.im is not an endorsement.",
    "If another confirmed payment takes the place first, your receipt keeps the payment state for review.",
]


def render_rules(settings: Settings) -> str:
    body = f"""{header('/rules')}<main id="main-content" class="rules-page">
<h1>How coin.im works</h1>
<ol>{''.join(f'<li>{escape(rule)}</li>' for rule in RULES)}</ol></main>{footer()}"""
    return page_shell(settings, "How coin.im works", "The rules for three paid slots and confirmed USDT outbids.", body, canonical_path="/rules")


def render_admin_login(settings: Settings, error: str = "") -> str:
    body = f"""<main id="main-content" class="admin-login"><p class="market-wordmark">coin.im</p><h1>Market admin</h1>
<form method="post" action="/admin/login"><label>Password<input type="password" name="password" required autocomplete="current-password"></label>
<p class="form-error" role="alert">{escape(error)}</p><button class="market-button" type="submit">Sign in</button></form></main>"""
    return page_shell(settings, "Market admin: coin.im", "Protected coin.im market administration.", body, canonical_path="/admin", noindex=True)


def render_admin(settings: Settings, summary: dict) -> str:
    state = summary["state"]
    rows = "".join(
        f"<tr><td>{escape(item['kind'])}</td><td>{escape(item['status'])}</td><td>{format_usdt(int(item['requested_amount_micro']))} USDT</td><td>{escape(item['created_at'])}</td></tr>"
        for item in summary["intents"]
    ) or '<tr><td colspan="4">No intents.</td></tr>'
    body = f"""{header()}<main id="main-content" class="admin-page"><p class="takeover-kicker">ADMIN</p><h1>Current market</h1>
<dl><div><dt>State</dt><dd>{escape(state['state'])}</dd></div><div><dt>Takeover price</dt><dd>{escape(state['takeoverPrice'])} USDT</dd></div>
<div><dt>Active reigns</dt><dd>{summary['reconcile']['activeReigns']}</dd></div><div><dt>Payments</dt><dd>{summary['counts']['payments']}</dd></div></dl>
<section><h2>Safety actions</h2><form method="post" action="/admin/hide"><label>Audit note<input name="note" required></label><button type="submit">Hide current message</button></form>
<form method="post" action="/admin/unlock"><label>Audit note<input name="note" required></label><button type="submit">Force-expire takeover lock</button></form></section>
<section><h2>Recent payment intents</h2><table><thead><tr><th>Kind</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead><tbody>{rows}</tbody></table></section>
</main>"""
    return page_shell(settings, "Market admin: coin.im", "Protected coin.im market administration.", body, canonical_path="/admin", noindex=True)


def render_badge_svg(reign: dict, takeover_price_value: str = "") -> bytes:
    if reign["status"] == "active":
        line_one = "LIVE ON COIN.IM"
        line_two = f"TAKEOVER PRICE: {takeover_price_value} USDT" if takeover_price_value else "ONE MESSAGE. THE WHOLE HOMEPAGE."
    else:
        line_one = "HELD COIN.IM"
        line_two = f"{reign['duration'].upper()} · {int(reign['verifiedReaders']):,} READERS"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="560" height="112" viewBox="0 0 560 112" role="img" aria-label="{escape(line_one)}">
<rect width="560" height="112" rx="0" fill="#f4efe6"/><rect x="1" y="1" width="558" height="110" fill="none" stroke="#201d18" stroke-width="2"/>
<circle cx="55" cy="56" r="25" fill="none" stroke="#9a4c2d" stroke-width="3"/><text x="55" y="65" text-anchor="middle" font-family="Georgia,serif" font-size="27" fill="#201d18">c</text>
<text x="96" y="48" font-family="ui-monospace,monospace" font-size="18" letter-spacing="2" fill="#201d18">{escape(line_one)}</text>
<text x="96" y="76" font-family="ui-monospace,monospace" font-size="13" letter-spacing="1" fill="#6a6259">{escape(line_two)}</text></svg>"""
    return svg.encode("utf-8")


def render_poster(settings: Settings, reign: dict, qr_svg: str) -> str:
    live = reign["status"] == "active"
    heading = "WE ARE LIVE ON COIN.IM" if live else "WE HELD COIN.IM"
    detail = "Our message is on the wall right now." if live else f"{reign['duration']} live"
    stats: list[str] = []
    if reign.get("verifiedReaders"):
        stats.append(f"{int(reign['verifiedReaders']):,} verified readers")
    if reign.get("countries"):
        stats.append(f"{int(reign['countries']):,} countries")
    body = f"""<main class="poster"><p class="takeover-kicker">coin.im</p><h1>{heading}</h1><p>{escape(detail)}</p>
<blockquote dir="auto">{escape(reign['message'])}</blockquote><div class="poster-qr">{qr_svg}</div>
<p>Scan to see it.</p><p>{' · '.join(stats)}</p></main>"""
    return page_shell(settings, f"{heading}: coin.im", reign["message"][:150], body, canonical_path=f"/reign/{reign['reignId']}/poster", noindex=True, page_class="market-page poster-document")


def result_png(snapshot: dict, vertical: bool = False) -> bytes:
    size = (1080, 1350) if vertical else (1200, 630)
    image = Image.new("RGB", size, "#f4efe6")
    draw = ImageDraw.Draw(image)
    font_path = find_font()
    mono_path = find_mono_font()
    title_font = ImageFont.truetype(font_path, 54 if vertical else 42)
    message_font = ImageFont.truetype(font_path, 62 if vertical else 50)
    detail_font = ImageFont.truetype(mono_path, 26 if vertical else 23)
    accent = "#9a4c2d"
    ink = "#201d18"
    muted = "#6a6259"
    margin = 88 if vertical else 76
    draw.rectangle((margin, margin, size[0] - margin, size[1] - margin), outline=ink, width=3)
    title, sub = result_card_copy(snapshot)
    draw.text((margin + 48, margin + 48), title, font=title_font, fill=ink)
    draw.line((margin + 48, margin + 124, size[0] - margin - 48, margin + 124), fill=accent, width=4)
    message = str(snapshot.get("message") or "One message on the message wall.")
    max_width = size[0] - 2 * (margin + 48)
    wrapped = wrap_text(draw, message, message_font, max_width, 8 if vertical else 5)
    draw.multiline_text((margin + 48, margin + 175), wrapped, font=message_font, fill=ink, spacing=16)
    bottom = size[1] - margin - 110
    draw.text((margin + 48, bottom), sub, font=detail_font, fill=muted)
    amount = snapshot.get("amount")
    if amount:
        amount_label = f"PAID {amount} USDT" if snapshot.get("type") == "takeover" else f"{amount} USDT VERIFIED"
        draw.text((margin + 48, bottom + 42), amount_label, font=detail_font, fill=accent)
    draw.text((size[0] - margin - 210, bottom + 42), "coin.im", font=detail_font, fill=ink)
    output = io.BytesIO()
    image.save(output, "PNG", optimize=True)
    return output.getvalue()


def result_card_copy(snapshot: dict) -> tuple[str, str]:
    snapshot_type = snapshot.get("type")
    if snapshot_type == "takeover":
        return "I TOOK OVER COIN.IM", "TAKE IT FROM ME"
    if snapshot_type == "defend":
        return (
            "I KEPT THIS MESSAGE HERE",
            f"CHANGE PRICE: {snapshot.get('takeoverPriceBefore')} TO {snapshot.get('takeoverPriceAfter')} USDT",
        )
    duration = str(snapshot.get("duration") or "")
    return (
        f"WE HELD COIN.IM FOR {duration}".strip(),
        f"{int(snapshot.get('verifiedReaders') or 0):,} VERIFIED READERS",
    )


def find_font() -> str:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
    ]
    return next((path for path in candidates if Path(path).is_file()), "/System/Library/Fonts/SFNS.ttf")


def find_mono_font() -> str:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/System/Library/Fonts/SFNSMono.ttf",
    ]
    return next((path for path in candidates if Path(path).is_file()), find_font())


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int, max_lines: int) -> str:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if draw.textlength(candidate, font=font) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
            if len(lines) >= max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    if len(lines) == max_lines and len(" ".join(lines)) < len(text):
        lines[-1] = lines[-1].rstrip(".,;: ") + "…"
    return "\n".join(lines)
