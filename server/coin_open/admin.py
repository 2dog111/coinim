"""Приватная панель: заявки с формы плюс посещаемость.

Пока это MVP под одного владельца: вход по секретной ссылке, анкета видна
целиком, файлы скачиваются в один клик. Логин с паролём предполагается
позже, поэтому страница отдаётся с запретом индексации и кеширования,
а расшифровка живёт только в памяти запроса.

Удаления из панели нет: для этого есть `coin-open delete` на сервере, где
ошибка стоит одного лишнего действия, а не одного клика.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from pathlib import Path

from .analytics import escape

JOB_RE = re.compile(r"^job_\d{8}T\d{6}Z_[a-f0-9]{16}$")
STORED_RE = re.compile(r"^\d{2}\.aesgcm$")


def list_jobs(data_root: Path, key: bytes, decrypt_json) -> list[dict]:
    """Заявки, новые сверху. Битую заявку показываем строкой об ошибке."""
    jobs_dir = data_root / "jobs"
    if not jobs_dir.is_dir():
        return []

    unread = set()
    notices = data_root / "notifications"
    if notices.is_dir():
        unread = {path.stem for path in notices.glob("job_*.json")}

    jobs = []
    for path in sorted(jobs_dir.iterdir(), reverse=True):
        if not path.is_dir() or not JOB_RE.fullmatch(path.name):
            continue
        source = path / "metadata.json.aesgcm"
        if not source.is_file():
            continue
        try:
            data = decrypt_json(source, key)
        except Exception:
            jobs.append({"job_id": path.name, "broken": True, "new": path.name in unread})
            continue

        files = []
        for item in data.get("files") or []:
            if not isinstance(item, dict):
                continue
            files.append(
                {
                    "name": str(item.get("original_name", ""))[:120],
                    "slot": str(item.get("slot", ""))[:40],
                    "size": item.get("size") or 0,
                    "stored": str(item.get("stored_name", ""))[:32],
                }
            )

        jobs.append(
            {
                "job_id": path.name,
                "new": path.name in unread,
                "at": data.get("upload_completed_at", ""),
                "name": data.get("name", ""),
                "email": data.get("work_email", ""),
                "phone": data.get("phone", ""),
                "role": data.get("role", ""),
                "company": data.get("company", ""),
                "office_address": data.get("office_address", ""),
                "source": data.get("source", "business-file"),
                "channels": data.get("channels", ""),
                "website": data.get("website", ""),
                "campaign_interest": data.get("campaign_interest", ""),
                "audience": data.get("audience", ""),
                "investor_brief": data.get("investor_brief", ""),
                "investor_slugs": data.get("investor_slugs", []),
                "files": files,
                "broken": False,
            }
        )
    return jobs


def acknowledge(data_root: Path, job_id: str) -> bool:
    if not JOB_RE.fullmatch(job_id):
        return False
    try:
        (data_root / "notifications" / f"{job_id}.json").unlink(missing_ok=True)
        return True
    except OSError:
        return False


def stored_file(data_root: Path, job_id: str, stored: str) -> Path | None:
    """Путь к зашифрованному файлу заявки. Ничего не угадываем."""
    if not JOB_RE.fullmatch(job_id) or not STORED_RE.fullmatch(stored):
        return None
    path = data_root / "jobs" / job_id / "files" / stored
    return path if path.is_file() else None


def original_name(data_root: Path, key: bytes, decrypt_json, job_id: str, stored: str) -> str:
    source = data_root / "jobs" / job_id / "metadata.json.aesgcm"
    try:
        data = decrypt_json(source, key)
    except Exception:
        return "file"
    for item in data.get("files") or []:
        if isinstance(item, dict) and item.get("stored_name") == stored:
            name = str(item.get("original_name") or "").strip()
            return re.sub(r'[\\/"\r\n]', "_", name)[:120] or "file"
    return "file"


def human_size(value: object) -> str:
    try:
        size = float(value)
    except (TypeError, ValueError):
        return ""
    if size <= 0:
        return ""
    for unit in ("Б", "КБ", "МБ", "ГБ"):
        if size < 1024 or unit == "ГБ":
            return f"{size:.0f} {unit}" if unit == "Б" else f"{size:.1f} {unit}"
        size /= 1024
    return ""


def channels_text(value: object) -> str:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    return str(value or "")


def job_block(job: dict, token: str) -> str:
    job_id = escape(job.get("job_id", ""))

    if job.get("broken"):
        return (
            '<article class="job"><h3>' + job_id + "</h3>"
            '<p class="warn">Анкету не удалось расшифровать. На сервере: '
            "<code>coin-open show " + job_id + "</code></p></article>"
        )

    rows = [
        ("Имя", job.get("name")),
        ("Компания", job.get("company")),
        ("Адрес офиса", job.get("office_address")),
        ("Форма", job.get("source")),
        ("Почта", job.get("email")),
        ("Телефон", job.get("phone")),
        ("Роль", job.get("role")),
        ("Связь", channels_text(job.get("channels"))),
        ("Сайт", job.get("website")),
        ("Кампания", job.get("campaign_interest")),
        ("Аудитория", job.get("audience")),
        ("Investor Match: профили", ", ".join(job.get("investor_slugs") or [])),
        ("Investor Match: бриф", job.get("investor_brief")),
    ]
    table = "".join(
        "<tr><th>" + escape(label) + "</th><td>" + escape(value) + "</td></tr>"
        for label, value in rows
        if str(value or "").strip()
    )

    files = job.get("files") or []
    if files:
        items = []
        for item in files:
            label = escape(item.get("name")) or "файл"
            if item.get("stored"):
                href = (
                    "/api/open/panel/" + escape(token) + "/file/"
                    + job_id + "/" + escape(item["stored"])
                )
                label = '<a href="' + href + '">' + label + "</a>"
            extra = ""
            if item.get("slot"):
                extra += ' <span class="muted">' + escape(item["slot"]) + "</span>"
            size = human_size(item.get("size"))
            if size:
                extra += ' <span class="muted">' + escape(size) + "</span>"
            items.append("<li>" + label + extra + "</li>")
        files_html = (
            '<p class="muted">Файлы, ' + str(len(files)) + ". Нажмите, чтобы скачать.</p>"
            '<ul class="files">' + "".join(items) + "</ul>"
        )
    else:
        files_html = '<p class="muted">Файлов нет.</p>'

    email = str(job.get("email") or "").strip()
    write = ""
    if email:
        write = '<p><a href="mailto:' + escape(email) + '">Написать на ' + escape(email) + "</a></p>"

    mark = ""
    if job.get("new"):
        mark = (
            '<form method="post" action="/api/open/panel/' + escape(token)
            + "/ack/" + job_id + '"><button type="submit">Отметить прочитанным</button></form>'
        )

    title = escape(job.get("name") or job.get("job_id"))
    badge = ' <span class="new">новая</span>' if job.get("new") else ""
    css = "job is-new" if job.get("new") else "job"

    return (
        '<article class="' + css + '"><h3>' + title + badge + "</h3>"
        '<p class="muted">' + escape(job.get("at") or "") + " · " + job_id + "</p>"
        "<table>" + table + "</table>" + write + files_html + mark + "</article>"
    )


def panel_html(jobs: list[dict], stats: dict, token: str) -> str:
    def grid(caption: str, headers: list[str], rows: list) -> str:
        head = "".join("<th>" + escape(item) + "</th>" for item in headers)
        body = "".join(
            "<tr>" + "".join("<td>" + escape(cell) + "</td>" for cell in row) + "</tr>"
            for row in rows
        )
        if not body:
            body = '<tr><td colspan="' + str(len(headers)) + '">пока пусто</td></tr>'
        return (
            "<h2>" + escape(caption) + "</h2>"
            '<table class="grid"><thead><tr>' + head + "</tr></thead><tbody>"
            + body + "</tbody></table>"
        )

    new_count = sum(1 for job in jobs if job.get("new"))
    jobs_html = (
        "".join(job_block(job, token) for job in jobs)
        if jobs
        else '<p class="muted">Заявок пока нет.</p>'
    )
    stamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

    return """<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>coin.im, заявки</title>
<style>
  body { margin: 0 auto; padding: 2.5rem 1.25rem 6rem; max-width: 62rem;
         background: #f8f4ee; color: #241f1b;
         font: 400 18px/1.6 Georgia, "Times New Roman", serif; }
  h1 { font-size: 1.6rem; font-weight: 400; margin: 0 0 0.25rem; }
  h2 { font-size: 1.15rem; font-weight: 400; margin: 3rem 0 0.75rem; }
  h3 { font-size: 1.05rem; font-weight: 400; margin: 0 0 0.2rem; }
  .muted { color: #6f665e; font-size: 0.84rem; }
  .warn { color: #8a4b2a; font-size: 0.9rem; }
  .job { padding: 1.25rem 1.4rem; margin: 0 0 1rem;
         background: #fffdf9; border: 1px solid #e3d9cc; }
  .job.is-new { border-color: #c9a86a; }
  .new { color: #8a6a2a; font-size: 0.8rem; }
  .job table { margin: 0.75rem 0 0.5rem; border-collapse: collapse; }
  .job th { width: 8rem; padding: 0.2rem 0.8rem 0.2rem 0; color: #6f665e;
            font-weight: 400; text-align: left; font-size: 0.86rem; }
  .job td { padding: 0.2rem 0; font-size: 0.95rem; }
  ul.files { margin: 0.3rem 0 0.6rem; padding-left: 1.1rem; font-size: 0.9rem; }
  button { padding: 0.35rem 0.9rem; background: #fffdf9; color: #241f1b;
           border: 1px solid #c2b6a4; font: inherit; font-size: 0.85rem;
           cursor: pointer; }
  table.grid { width: 100%; border-collapse: collapse;
               font: 400 0.84rem/1.5 ui-monospace, "SF Mono", Menlo, monospace; }
  table.grid th, table.grid td { padding: 0.45rem 0.6rem; text-align: left;
                                 border-bottom: 1px solid #e3d9cc; }
  table.grid th { color: #6f665e; font-weight: 400; }
  table.grid td:nth-child(n+2) { font-variant-numeric: tabular-nums; }
  a { color: #241f1b; }
  .muted,.warn,.new,.job th,.job td,ul.files,button,table.grid {font-size:18px} .job{border-radius:14px} .job td{overflow-wrap:anywhere} button{min-height:48px;border-radius:24px;background:linear-gradient(#fff,#edf0e4)} button:focus-visible,a:focus-visible{outline:3px solid #52775c;outline-offset:3px} @media(max-width:540px){.job{padding:20px 16px}.job th{width:6rem}table.grid{display:block;overflow:auto}}
</style></head><body>
<h1>Заявки с формы</h1>
<p class="muted">Всего """ + escape(len(jobs)) + ", новых " + escape(new_count) + ". Обновлено " + escape(stamp) + """.
Файлы скачиваются по ссылке в заявке, на диске они лежат зашифрованными.
Удаление только на сервере: <code>coin-open delete &lt;job_id&gt;</code>.</p>
""" + jobs_html + """
<h2>Посещаемость за """ + escape(stats["days"]) + """ дней</h2>
<p class="muted">Уникальных людей: """ + escape(stats["total_people"]) + """. Боты и обходчики не считаются.
Адреса и User-Agent не хранятся, идентификатор посетителя это хеш на соли, которая меняется каждые сутки.</p>
""" + grid("По дням", ["День", "Люди", "Просмотры"], stats["by_day"]) \
    + grid("По страницам", ["Страница", "Люди", "Просмотры"], stats["by_page"]) \
    + grid("Кнопки", ["Кнопка", "Страница", "Нажатий", "Людей"], stats["clicks"]) \
    + grid("Последние нажатия", ["Когда", "Страница", "Кнопка"], stats["recent"]) + """
</body></html>"""
