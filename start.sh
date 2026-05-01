#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

PYTHON_BIN="${PYTHON_BIN:-}"
if [ -z "$PYTHON_BIN" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN=python3
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN=python
  else
    echo "Python is required but was not found." >&2
    exit 1
  fi
fi

"$PYTHON_BIN" -m pip install -r requirements.txt
exec "$PYTHON_BIN" run.py
