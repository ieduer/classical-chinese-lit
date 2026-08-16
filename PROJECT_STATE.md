# Project State

Last updated: 2026-08-16 PDT
Current version: production deployment `196c6dc7-ff25-49d5-a5ba-af8843fb31de` from pushed commit `8ca8d77`
Current objective: publish all four subparts of 2026 Beijing Chinese question 14 in simplified Chinese
Completed work: reconciled the exact production artifact in `c60c76f`; added four questions, correct answers and source/model evidence in `b9b69b8`; added hash-pinned data/script bindings and validation in `3042953`; passed the normal gate and deployed the checksum-pinned artifact
Pending work: merge draft PR #1 after the operator's normal review; no production content work remains for this release
Known problems: canonical worktree contains unrelated dirty mastery/layout work and remains excluded
Next recommended task: preserve the isolated release worktree until PR #1 is reviewed; never deploy the canonical dirty checkout
Deployment status: live at `mf.bdfz.net`; data SHA-256 `ad0aad7245517e84d49fe967c6207ed07df51bd6c9c4c483d770336f1eaa1f50`
Rollback anchor: `24b07328-8be8-4d95-9a3e-54efb12c1afa`
Operations authority: `docs/OPERATIONS.md`
Ownership status: `20260816-mf-beijing-2026-release`
