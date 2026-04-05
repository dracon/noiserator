---
name: commit
description: Stage and commit changes with a descriptive message following conventional commit style
disable-model-invocation: true
argument-hint: [message]
allowed-tools: Bash
---

Create a Git commit for the current changes.

If `$ARGUMENTS` is provided, use it as the commit message. Otherwise, analyze the changes and write a concise commit message.

Steps:
1. Run `git status` to see untracked and modified files (never use `-uall`)
2. Run `git diff` and `git diff --staged` to understand all changes
3. Run `git log --oneline -5` to match the repo's commit message style
4. Stage relevant files by name (avoid `git add -A` or `git add .` — never stage `.env`, credentials, or large binaries)
5. Draft a concise commit message (1-2 sentences) focusing on the "why"
6. Create the commit using a HEREDOC:
   ```
   git commit -m "$(cat <<'EOF'
   message here

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   EOF
   )"
   ```
7. Run `git status` to confirm success

Rules:
- NEVER amend existing commits unless explicitly asked
- NEVER use `--no-verify` or skip hooks
- Do not commit files that likely contain secrets
- If a pre-commit hook fails, fix the issue and create a NEW commit
- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
