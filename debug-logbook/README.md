# Debug Logbook

This folder keeps a daily record of debugging work, open risks, and fixes made in the project.

## How To Use

Each debugging day should have two files in **this folder** (no subfolders), so they sort next to each other:

- `YYYY-MM-DD.md` — detailed log
- `YYYY-MM-DD_brief.md` — brief log

Use Hong Kong date (`Asia/Hong_Kong`) for the filename. Example:

```text
2026-05-05.md
2026-05-05_brief.md
```

## Brief Log

The brief log is for quick scanning. Keep it to 1–3 sentences covering:

- what changed,
- what was found,
- what remains next.

## Detailed Log

The detailed log should include:

- context / trigger,
- files or systems touched,
- changes made,
- verification performed,
- bugs found,
- risks / follow-up tasks.

## Update Rules

- Add or update the current day’s brief and detailed logs whenever debugging or fixing production behavior.
- Keep logs factual and concise.
- Do not paste secrets, tokens, private keys, OAuth secrets, payment secrets, or user PII.
- If a bug is found but not fixed, put it under `Open Follow-Ups`.
- If a fix is deployed, include the deploy command/result summary under `Verification`.
