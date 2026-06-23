#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    uv venv
fi

uv pip install -r requirements.txt

export FLASK_APP=app.main:app
uv run flask run --host 127.0.0.1 --port 8000 --debug
