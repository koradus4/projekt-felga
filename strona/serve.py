# -*- coding: utf-8 -*-
# Lokalny serwer podgladu strony z poprawnymi typami MIME
# Uruchom w folderze strona:  python serve.py   ->  http://localhost:8000
import http.server
import mimetypes
import socketserver

mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('model/stl', '.stl')
mimetypes.add_type('image/svg+xml', '.svg')

PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("Podglad lokalny: http://localhost:%d  (Ctrl+C konczy)" % PORT)
    httpd.serve_forever()
