"""A stable owner entry point using the existing admin key."""
import hashlib
import hmac
import time
from http.cookies import SimpleCookie, CookieError


def login_html():
    return '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>coin.im · Заявки</title><style>body{margin:8vh auto;padding:24px;max-width:460px;background:#f8f6f0;color:#24251f;font:400 18px/1.6 system-ui}h1{font:400 56px Georgia}input,button{box-sizing:border-box;width:100%;min-height:54px;margin:14px 0;padding:14px;font:inherit;border:1px solid #aebda6;border-radius:16px;background:#fffefa;color:inherit}button{background:linear-gradient(#fff,#dfebd5);cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid #42664c}#status{color:#8b3027}</style><h1>coin.im</h1><h2 style="font-weight:400">Заявки</h2><form><label for="key">Ключ доступа</label><input id="key" type="password" autocomplete="current-password" required><button>Войти</button><p id="status" role="status"></p></form><script>document.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const b=document.querySelector('button');b.disabled=true;try{const r=await fetch('/api/open/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:document.querySelector('input').value})});if(r.ok)location.reload();else document.querySelector('#status').textContent='Не удалось войти. Проверьте ключ доступа.'}catch{document.querySelector('#status').textContent='Нет соединения. Попробуйте ещё раз.'}finally{b.disabled=false}})</script></html>'''


def cookie_value(secret, expiry):
    signature = hmac.new(secret.encode(), f"admin:{expiry}".encode(), hashlib.sha256).hexdigest()
    return f"{expiry}.{signature}"


def authorized(headers, secret):
    if not secret:
        return False
    try:
        cookies=SimpleCookie();cookies.load(headers.get("cookie", ""))
        value=cookies["coin_admin"].value
        expiry=int(value.split('.')[0])
        return time.time() < expiry <= time.time()+28801 and hmac.compare_digest(value,cookie_value(secret,expiry))
    except (KeyError, ValueError, CookieError):
        return False


async def handle(scope, receive, send):
    from . import app as intake
    from . import admin, analytics
    headers=intake.headers_dict(scope);secret=intake.admin_token()
    if scope.get('method')=='POST':
        data=await intake.read_json(receive)
        supplied=data.get('key')
        if not secret or not isinstance(supplied,str) or not hmac.compare_digest(supplied,secret):
            intake.check_rate_limit(intake.client_ip(scope,headers),intake.load_key())
            raise intake.IntakeError(401,'Access denied.')
        value=cookie_value(secret,int(time.time())+28800)
        await send({'type':'http.response.start','status':200,'headers':[(b'content-type',b'application/json'),(b'cache-control',b'no-store'),(b'set-cookie',f'coin_admin={value}; Path=/api/open/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800'.encode())]})
        await send({'type':'http.response.body','body':b'{"ok":true}'})
        return
    if authorized(headers,secret):
        intake.prepare_root()
        jobs=admin.list_jobs(intake.DATA_ROOT,intake.load_key(),intake.read_json_encrypted)
        await intake.send_html(send,200,admin.panel_html(jobs,analytics.summary(intake.DATA_ROOT),secret))
    else:
        await intake.send_html(send,200,login_html())
