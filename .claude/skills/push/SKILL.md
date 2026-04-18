---
name: push
description: Push commits to the remote Git repository
disable-model-invocation: true
argument-hint: "[remote] [branch]"
allowed-tools: Bash
---

Push commits to the remote repository.

If `$ARGUMENTS` is provided, use it as the remote/branch (e.g. `origin main`). Otherwise, push the current branch to its tracking remote.

Steps:
1. Run `git status` and `git log --oneline origin/HEAD..HEAD` to show what will be pushed
2. Confirm the remote and branch before pushing
3. Run `git push` (with `-u` if no upstream is set)
4. Report the result — number of commits pushed and the remote URL

Rules:
- NEVER force push (`--force`, `--force-with-lease`) to main/master without explicit user confirmation
- If push is rejected, diagnose the issue (diverged history, permissions) and explain options
- If no remote is configured, help the user set one up
