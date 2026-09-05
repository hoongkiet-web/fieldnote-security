#!/usr/bin/env python3
"""Blocks any `git push` that targets origin's main branch from executing via
Claude Code. Project policy: main pushes are Kiet's manual action only,
always - see memory/standards.md (fieldnote-security-scanner repo). This
hook enforces that even on a direct, explicit in-chat instruction to push
main; the point of the rule is that Kiet decides when main gets pushed, not
that any individual push looks safe enough to skip the gate. git push
origin staging and other branches are unaffected.

Deliberately errs toward over-blocking, not under-blocking: a false
positive just means "run it yourself", a false negative is the actually
dangerous direction. Tested against 15 command shapes (both directions)
before deployment - see session-reports/2026-09-03-main-push-permission-block-implemented.md
(in the fieldnote-security-scanner repo).
"""
import json
import re
import subprocess
import sys

REASON = (
    "BLOCKED by project policy: 'git push origin main' must always be run "
    "manually by Kiet in his own terminal, never via Claude Code (see "
    "memory/standards.md in the scanner repo). This applies even to a "
    "direct, explicit in-chat instruction - the point of this rule is that "
    "Kiet decides when main gets pushed, not that any individual push looks "
    "safe enough to skip the gate. Please run this command yourself in "
    "your own terminal. (git push origin staging and other branches are "
    "unaffected.)"
)


def deny():
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": REASON,
        }
    }))
    sys.exit(0)


def allow():
    print("{}")
    sys.exit(0)


try:
    payload = json.load(sys.stdin)
except Exception:
    allow()

cmd = (payload.get("tool_input") or {}).get("command", "") or ""

if "git push" not in cmd:
    allow()

# Explicit refspec mentioning both origin and main, in any flag order/shape
# (git push origin main / origin HEAD:main / -u origin main / --force origin
# main / --delete origin main / etc). Deliberately broad (word-boundary
# match, not exact refspec parsing) - false positives just mean "run it
# yourself", false negatives would be the actually dangerous direction.
if re.search(r"\borigin\b", cmd) and re.search(r"\bmain\b", cmd):
    deny()

# Bare `git push` / `git push origin` with no explicit refspec, relying on
# the current branch's tracking info - only dangerous if that branch is main.
if re.match(r"^\s*git\s+push(\s+origin)?\s*(--force|-f)?\s*$", cmd):
    try:
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        branch = ""
    if branch == "main":
        deny()

allow()
