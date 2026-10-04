#!/usr/bin/env python3
"""
run_local.py - Instant Local Runner for Mac
Starts a lightweight local HTTP server and opens InvoiceMaster in your browser.
Zero dependencies required (pure standard Python library).
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 54321
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Gracefully handle browser favicon requests
        if self.path == '/favicon.ico':
            self.send_response(204)  # 204 No Content
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, format, *args):
        try:
            msg = format % args
            # Silence routine static asset requests to keep terminal clean
            if "GET /assets/" in msg or "favicon.ico" in msg:
                return
            sys.stderr.write(f"{self.address_string()} - - [{self.log_date_time_string()}] {msg}\n")
        except Exception:
            pass

def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://127.0.0.1:{PORT}"
        print("=" * 60)
        print("  🧾 InvoiceMaster - Local Desktop App Running")
        print("=" * 60)
        print(f"  • App URL:          {url}")
        print(f"  • Sample Catalog:   {DIRECTORY}/sample-catalog.xlsx")
        print(f"  • Data Storage:     100% Local (Offline)")
        print("=" * 60)
        print("  Press Ctrl+C in terminal to stop the local server.\n")

        # Open automatically in browser
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down InvoiceMaster server. Goodbye!")
            httpd.server_close()
            sys.exit(0)

if __name__ == "__main__":
    main()
