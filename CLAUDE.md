## gstack (REQUIRED — always on)

gstack is mandatory for **all** AI-assisted work in this repo — every session, every
task, not just when a skill is invoked.

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

**Enforcement:** the `PreToolUse` hook in `.claude/settings.json`
(`.claude/hooks/check-gstack.sh`) runs on **every** tool call (matcher `*`) and blocks
all work until gstack is installed globally. This is what makes gstack "always used".

### Using gstack (always)

Skills like `/qa`, `/ship`, `/review`, `/investigate`, and `/browse` are available after
install. Reach for them by default:

- `/browse` — all web browsing and UI/visual QA (always check desktop **and** mobile).
- `/review` — review the diff before committing.
- `/qa` — verify behavior actually works.
- `/ship` — land and deploy changes.

Use `~/.claude/skills/gstack/...` for gstack file paths (the global install path).
