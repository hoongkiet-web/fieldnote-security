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

FS-141 correction (2026-09-15): the original version scanned the *entire*
raw command string for the words "origin" and "main" anywhere in it - which
false-positived on a `git commit -m "..." && git push origin staging` whose
commit message happened to mention "main" in unrelated prose (see
session-reports/2026-09-15-fs104-review-followups.md in the scanner repo).
Fixed by isolating just the actual `git push ...` invocation(s) within the
command (bounded by the next shell separator or end of string) and only
inspecting that isolated segment - so text elsewhere in the same compound
command (commit messages, other subcommands, comments) can no longer
trigger a false match. Still deliberately regex-based, not a full shell
parser - a contrived case (a heredoc body containing the literal text
"git push origin main") could still over-block, which is the safe
direction this hook has always preferred.
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

# Shell statement separators used to bound an isolated `git push` segment.
# Deliberately simple token matching, not a real shell parser - see the
# FS-141 note above on the resulting (safe-direction) edge case.
_SEPARATOR_RE = re.compile(r"&&|\|\||;|\n|\|")
_GIT_PUSH_RE = re.compile(r"\bgit\s+push\b")


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


def push_segments(cmd: str):
    """Yield each isolated `git push ...` invocation found in cmd, bounded
    by the next shell separator (or end of string) - not the full raw
    command text. This is what keeps unrelated text elsewhere in a
    compound command (e.g. a commit message earlier in the same `&&`
    chain) from being scanned at all."""
    for match in _GIT_PUSH_RE.finditer(cmd):
        rest = cmd[match.start():]
        sep = _SEPARATOR_RE.search(rest)
        yield rest[:sep.start()] if sep else rest


def targets_main(segment: str) -> bool:
    # Explicit refspec mentioning both origin and main, in any flag
    # order/shape (git push origin main / origin HEAD:main / -u origin main
    # / --force origin main / --delete origin main / etc), scoped to just
    # this one push invocation now, not the whole command string.
    if re.search(r"\borigin\b", segment) and re.search(r"\bmain\b", segment):
        return True

    # Bare `git push` / `git push origin` with no explicit refspec, relying
    # on the current branch's tracking info - only dangerous if that branch
    # is main. Applied per-segment (not requiring the *entire* raw command
    # to be exactly this), so this now also correctly catches it inside a
    # compound command like `git checkout main && git push`.
    if re.match(r"^\s*git\s+push(\s+origin)?\s*(--force|-f)?\s*$", segment):
        try:
            branch = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip()
        except Exception:
            branch = ""
        if branch == "main":
            return True

    return False


try:
    payload = json.load(sys.stdin)
except Exception:
    allow()

cmd = (payload.get("tool_input") or {}).get("command", "") or ""

if "git push" not in cmd:
    allow()

for segment in push_segments(cmd):
    if targets_main(segment):
        deny()

allow()
