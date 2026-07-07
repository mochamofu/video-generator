"""CapCut風タイムラインエディタのローカルサーバ。

使い方:
    python3 -m shortgen edit scripts/invest/shikiho_yomikata.json

- PCでもスマホでも(同じWi-Fiなら)ブラウザで編集できる
- 映像/音声の2トラック表示、ドラッグで並べ替え、右端ドラッグで長さ調整
- 「保存」で台本JSONに書き戻し、「🎬」でその場でレンダリング→mp4ダウンロード
"""

from __future__ import annotations

import json
import os
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HTML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "editor.html")

_state = {"script_path": "", "tts": "auto", "render": {"state": "idle", "message": ""},
          "out_path": ""}


def _lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def _render_worker() -> None:
    from .renderpro import render_pro
    _state["render"] = {"state": "running", "message": ""}
    try:
        slug = os.path.splitext(os.path.basename(_state["script_path"]))[0]
        out = os.path.join("output", slug + ".mp4")
        render_pro(_state["script_path"], out, tts_name=_state["tts"])
        _state["out_path"] = out
        _state["render"] = {"state": "done", "message": out}
    except Exception as e:  # noqa: BLE001
        _state["render"] = {"state": "error", "message": str(e)[-300:]}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # 静かに
        pass

    def _send(self, code: int, body: bytes, ctype: str = "application/json") -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        if self.path in ("/", "/index.html"):
            with open(HTML_PATH, "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
        elif self.path == "/script":
            with open(_state["script_path"], "rb") as f:
                self._send(200, f.read())
        elif self.path == "/name":
            self._send(200, os.path.basename(_state["script_path"]).encode(),
                       "text/plain; charset=utf-8")
        elif self.path == "/status":
            self._send(200, json.dumps(_state["render"]).encode())
        elif self.path == "/video":
            out = _state.get("out_path")
            if out and os.path.exists(out):
                with open(out, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Disposition",
                                 f'attachment; filename="{os.path.basename(out)}"')
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self._send(404, b'{"error":"not rendered"}')
        else:
            self._send(404, b'{"error":"not found"}')

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        if self.path == "/save":
            try:
                script = json.loads(body)
                assert isinstance(script.get("scenes"), list) and script["scenes"]
            except Exception:
                return self._send(400, b'{"error":"invalid script"}')
            with open(_state["script_path"], "w", encoding="utf-8") as f:
                json.dump(script, f, ensure_ascii=False, indent=2)
            self._send(200, b'{"ok":true}')
        elif self.path == "/render":
            if _state["render"]["state"] == "running":
                return self._send(409, b'{"error":"already running"}')
            threading.Thread(target=_render_worker, daemon=True).start()
            self._send(200, b'{"ok":true}')
        else:
            self._send(404, b'{"error":"not found"}')


def serve(script_path: str, port: int = 7860, tts: str = "auto") -> None:
    if not os.path.exists(script_path):
        raise FileNotFoundError(script_path)
    _state["script_path"] = os.path.abspath(script_path)
    _state["tts"] = tts
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("📝 エディタを起動しました:")
    print(f"   PC:     http://127.0.0.1:{port}")
    print(f"   スマホ:  http://{_lan_ip()}:{port}  (同じWi-Fiから)")
    print("   Ctrl+C で終了")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n終了します")
