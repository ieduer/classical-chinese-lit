# Project State

Last updated: 2026-08-16 PDT
Current version: clean release candidate `3042953` on `agent/beijing-2026-mf`
Current objective: publish all four subparts of 2026 Beijing Chinese question 14 in simplified Chinese
Completed work: reconciled the exact production artifact in `c60c76f`; added four questions, correct answers and source/model evidence in `b9b69b8`; added hash-pinned data/script bindings and validation in `3042953`
Pending work: push, open a draft PR, pass the normal gate, deploy the checksum-pinned artifact, and verify live data/UI hashes
Known problems: canonical worktree contains unrelated dirty mastery/layout work and remains excluded
Next recommended task: deploy only this isolated clean branch artifact; preserve all existing immutable rollback deployments
Deployment status: candidate only; production remains `24b07328-8be8-4d95-9a3e-54efb12c1afa`
Rollback anchor: `24b07328-8be8-4d95-9a3e-54efb12c1afa`
Operations authority: `docs/OPERATIONS.md`
Ownership status: `20260816-mf-beijing-2026-release`
