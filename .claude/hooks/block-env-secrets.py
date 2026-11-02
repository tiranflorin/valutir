#!/usr/bin/env python3
"""PreToolUse guard: keep local secrets (.env files, JWT keys, environment dumps) out of Claude's context.

Blocks:
  - file tools (Read, Edit, Write, NotebookEdit, Grep) aimed at secret env files or JWT private keys;
  - shell commands that name such a file, or that print environment values
    (printenv, bare env/set/export -p, docker compose config, docker inspect,
    Symfony debug:dotenv / --env-vars, /proc/*/environ).

Allowed: templates without real values (.env.dist, .env.sample, .env.example) and
references inside JS/PHP code such as import.meta.env or process.env.
Fails closed: the hook is configured with onFailure "block".
"""
from typing import Optional
import json
import os
import re
import sys

TEMPLATE_SUFFIXES = (".dist", ".sample", ".example")
# ".env", ".env.local", ".env.ci", ... as a path segment (not "process.env" or ".envrc").
ENV_FILE = re.compile(r"(?<![\w.-])\.env(?:\.[\w-]+)*(?![\w-])")
JWT_KEY = re.compile(r"config/jwt/[\w.-]*\.pem\b")

ENV_DUMP_PATTERNS = [
    (r"\bprintenv\b", "printenv"),
    (r"(?:^|[;&|(]|\s)env\s*(?:$|[;&|)])", "bare env"),
    (r"(?:^|[;&|(]\s*)set\s*(?:$|[;&|)])", "bare set"),
    (r"\bexport\s+-p\b|\bdeclare\s+-x\b", "export -p / declare -x"),
    (r"\bdocker(?:-compose|\s+compose)\b[^;&|]*\sconfig\b", "docker compose config"),
    (r"\bdocker\s+(?:container\s+|image\s+)?inspect\b", "docker inspect"),
    (r"debug:dotenv|--env-vars?\b", "Symfony env debug output"),
    (r"/proc/[^\s]*/environ", "/proc/*/environ"),
]


def is_secret_env_name(name: str) -> bool:
    return not name.endswith(TEMPLATE_SUFFIXES)


def secret_in_path(path: str) -> Optional[str]:
    if not path:
        return None
    base = os.path.basename(path.rstrip("/"))
    if ENV_FILE.fullmatch(base) and is_secret_env_name(base):
        return base
    if JWT_KEY.search(path.replace(os.sep, "/")):
        return "JWT private key"
    return None


def secret_in_command(command: str) -> Optional[str]:
    for match in ENV_FILE.finditer(command):
        if is_secret_env_name(match.group(0)):
            return f"it references the secret env file '{match.group(0)}'"
    if JWT_KEY.search(command):
        return "it references a JWT key file"
    for pattern, label in ENV_DUMP_PATTERNS:
        if re.search(pattern, command):
            return f"it prints environment values ({label})"
    return None


def deny(reason: str) -> None:
    json.dump({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"Blocked by .claude/hooks/block-env-secrets.py: {reason}. "
                "Local secrets must not be read or sent to the model. Use the committed templates "
                "(.env.dist / .env.sample) for variable names, or ask the user to run the command "
                "themselves and share only non-secret results."
            ),
        }
    }, sys.stdout)
    sys.exit(0)


def main() -> None:
    payload = json.load(sys.stdin)
    tool = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}

    if tool == "Bash":
        reason = secret_in_command(str(tool_input.get("command", "")))
        if reason:
            deny(reason)
    elif tool in ("Read", "Edit", "Write", "NotebookEdit", "Grep"):
        for key in ("file_path", "notebook_path", "path", "glob"):
            found = secret_in_path(str(tool_input.get(key) or ""))
            if found:
                deny(f"{tool} targets {found}")
    sys.exit(0)


if __name__ == "__main__":
    main()
