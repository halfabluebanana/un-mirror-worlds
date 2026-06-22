#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -r requirements.txt
export FLASK_APP=app.main:app
python3 -m flask run --host 127.0.0.1 --port 8000 --debug
