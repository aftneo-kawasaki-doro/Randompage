#!/usr/bin/env python3
"""
Validate articles.json:
- parses JSON
- expects top-level array
- each item must be an object with an integer `id`
- `id` values must be unique
- requires `title` (optional: remove if you don't want it)
Project root is computed by get_project_root() which currently returns Path.cwd().
"""

import json
import sys
import os
from pathlib import Path
from typing import Optional


def get_project_root() -> Path:
    """
    Return the project root directory.

    Current behavior: return the current working directory (Path.cwd()).
    If you want to change how the root is discovered (git, env var, __file__-based, etc.),
    modify this function — the rest of the script will keep working.
    """
    # Optional override via environment variable (handy for local testing)
    env = os.environ.get("PROJECT_ROOT")
    if env:
        p = Path(env)
        if p.exists():
            return p
    return Path.cwd()


ROOT = get_project_root()
ARTICLES_PATH = ROOT / "docs" / "articles.json"


def fail(msg: str, code: int = 1) -> None:
    print("ERROR:", msg)
    sys.exit(code)


def is_int(v) -> bool:
    return isinstance(v, int)


def main() -> None:
    if not ARTICLES_PATH.exists():
        fail(f"{ARTICLES_PATH} not found")

    try:
        data = json.loads(ARTICLES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"JSON parse error: {exc}")

    if not isinstance(data, list):
        fail("Expected top-level JSON array of articles")

    ids = []
    errors = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            errors.append(f"item[{i}] is not an object")
            continue

        if "id" not in item:
            errors.append(f"item[{i}] missing 'id'")
        else:
            if not is_int(item["id"]):
                errors.append(f"item[{i}] 'id' is not an int (value={item['id']!r})")
            else:
                ids.append(item["id"])

        # keep title requirement for now; remove if unwanted
        if "title" not in item:
            errors.append(f"item[{i}] missing 'title'")

    # check uniqueness
    seen = set()
    dup = set()
    for v in ids:
        if v in seen:
            dup.add(v)
        else:
            seen.add(v)
    if dup:
        errors.append(f"Duplicate id(s) found: {sorted(dup)}")

    if errors:
        print("Validation failed with the following issues:")
        for e in errors:
            print(" -", e)
        sys.exit(2)

    print("articles.json validation passed ✅")


if __name__ == "__main__":
    main()
