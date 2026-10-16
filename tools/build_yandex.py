#!/usr/bin/env python3
"""Собирает zip для загрузки в Яндекс Игры.
Использование:  python3 tools/build_yandex.py wss://ваш-сервер.example.com
"""
import sys, zipfile, os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
game = os.path.join(root, 'game')
server = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else ''
if server and not server.startswith('wss://'):
    print('ВНИМАНИЕ: для Яндекс Игр адрес сервера должен быть wss:// (HTTPS).')
out = os.path.join(root, 'penguin-sumo-yandex.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(game)):
        if f == 'sw.js':  # service worker в iframe Яндекса не нужен
            continue
        data = open(os.path.join(game, f), 'rb').read()
        if f == 'config.js':
            data = re.sub(rb"SERVER_URL:\s*'[^']*'", ("SERVER_URL: '%s'" % server).encode(), data)
        if f == 'index.html':
            data = data.replace(b'<link rel="manifest" href="manifest.webmanifest">\n', b'')
        if f == 'manifest.webmanifest':
            continue
        z.writestr(f, data)
print('Готово:', out, '| сервер:', server or '(не задан!)')
