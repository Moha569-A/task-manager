#!/usr/bin/env bash
# TaskFlow — one-command launcher
set -euo pipefail
cd "$(dirname "$0")"

python3 -m pip install -q -r backend/requirements.txt
echo "Starting TaskFlow on http://localhost:8000  (demo: demo@taskflow.app / demo1234)"
exec python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
