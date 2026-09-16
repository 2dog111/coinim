"""Local site and existing intake, with temporary encrypted storage.

Requires Python 3.11+ and server/requirements.txt. Uses no production keys or
services. Local enquiries disappear when the preview exits normally.
"""
from pathlib import Path
import mimetypes
import os
import secrets
import sys
import tempfile
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'server'))

def main():
    import uvicorn
    port = int(os.environ.get('COIN_PREVIEW_PORT', '4173'))
    with tempfile.TemporaryDirectory(prefix='coin-im-preview-') as directory:
        storage = Path(directory)
        key = storage / 'encryption.key'
        key.write_bytes(secrets.token_bytes(32))
        key.chmod(0o600)
        token = storage / 'admin-token'
        token.write_text(secrets.token_hex(32))
        token.chmod(0o600)
        os.environ.update(
            COIN_OPEN_DATA_ROOT=str(storage / 'data'),
            COIN_OPEN_KEY_PATH=str(key),
            COIN_OPEN_ADMIN_TOKEN_PATH=str(token),
            COIN_OPEN_ALLOWED_ORIGINS=f'http://127.0.0.1:{port},http://localhost:{port}',
        )
        from coin_open.app import app as intake

        async def app(scope, receive, send):
            if scope['type'] != 'http':
                return
            path = scope['path']
            if path.startswith('/api/open/'):
                return await intake(scope, receive, send)
            if scope['method'] not in ('GET', 'HEAD'):
                status, body, content_type = 405, b'Method not allowed', 'text/plain'
            else:
                target = (ROOT / unquote(path).lstrip('/')).resolve()
                if target.is_dir():
                    target = target / 'index.html'
                if not target.is_file() and not target.suffix:
                    target = target.with_suffix('.html')
                public = target == ROOT / 'index.html' or (
                    target.is_relative_to(ROOT / 'assets') or
                    target.name in {'index.html', 'ms.html', 'open.html', 'handling.html', 'mail.html', 'msru.html'}
                    and target.parent in {ROOT, *(ROOT / p for p in ('ms', 'open', 'handling', 'mail', 'msru'))}
                )
                if public and target.is_relative_to(ROOT) and target.is_file():
                    status, body = 200, target.read_bytes()
                    content_type = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
                else:
                    status, body, content_type = 404, b'Not found', 'text/plain'
            await send({'type': 'http.response.start', 'status': status, 'headers': [
                (b'content-type', content_type.encode()), (b'cache-control', b'no-store'),
            ]})
            await send({'type': 'http.response.body', 'body': b'' if scope['method'] == 'HEAD' else body})

        print(f'Local preview: http://127.0.0.1:{port}', flush=True)
        print(f'Local enquiry storage (temporary): {storage / "data"}', flush=True)
        uvicorn.run(app, host='127.0.0.1', port=port, lifespan='off', access_log=False)

if __name__ == '__main__':
    main()
