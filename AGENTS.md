# AGENTS.md for 高考默写

This project inherits `/Users/ylsuen/CF/AGENTS.md`.

- Canonical source is `/Users/ylsuen/CF/classical-chinese-lit`; production is Cloudflare Pages project
  `mf` at `mf.bdfz.net`.
- Preserve the canonical dirty worktree. Releases must start from the exact checksummed production
  artifact documented in `docs/OPERATIONS.md`, then be committed, pushed and pass the normal gate.
- Use content-hashed JavaScript and data filenames. Do not rely on query strings to bypass the custom
  domain cache.
- 2026 true-paper content is Beijing-only, simplified Chinese, and hash-bound to the GKS coverage and
  source scan. Do not add national, other-province, mock, prediction, sample or memory-only papers.
- Do not modify User Center, navigation, APIS, identity, progress, Pulse or companion contracts for a
  content-only release.
