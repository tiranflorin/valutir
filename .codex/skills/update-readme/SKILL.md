---
name: update-readme
description: Use this skill when a new feature, route, or dependency is added to the project.
---

# Update README

Keep the project documentation accurate when a feature, route, or dependency changes.

The documentation is split: `README.md` stays short and covers the product and business side (what ValuTir does, plans and pricing, product ideas, quick start, a documentation index). Technical detail lives in `docs/`:

| Topic | File |
|---|---|
| Running, testing, configuration, environment variables, repository layout | `docs/development.md` |
| API endpoints | `docs/api.md` (and the endpoint table in `AGENTS.md`) |
| Scheduled commands and reminders | `docs/scheduled-commands.md` |
| Emails | `docs/emails.md` |
| Payments and Stripe | `docs/payments.md` |
| Cloudflare hosting, security headers, client IPs behind proxies | `docs/cloudflare-and-proxies.md` |
| Deployment architecture and decisions | `docs/architecture.md` |
| Pre-launch checklist | `docs/go-live-checklist.md` |
| Known issues and the numbered TODO list | `docs/status-and-todo.md` |

1. Read the relevant file(s) above and inspect the changed project files or configuration needed to verify the change.
2. Update the matching `docs/` file with:
   - a concise description of what changed;
   - how to use a user-facing feature or route, when applicable;
   - any new dependency, including its purpose and relevant install or run step.

   Touch `README.md` only for user-facing product or pricing changes (a short line in "What it does" or "Plans and pricing"), or to add a new `docs/` file to its documentation index.
3. Follow each file's existing structure and writing style. If no file fits, add the smallest clear section, or a new `docs/` file listed in the README index, rather than duplicating information.
4. Remove or correct documentation made stale by the change. Do not document secrets, local environment values, or unverified behavior.
5. Review the changed files for accuracy, concise wording, valid Markdown, and consistent headings.
6. Never read or transmit anything from any .env files.