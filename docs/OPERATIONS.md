# 高考默写 operations

Owner: suen  
Lifecycle: active  
Data class: student_owned  
Runtime: Cloudflare Pages project `mf`, domain `mf.bdfz.net`

## Production source authority

The immediate pre-release production is deployment `24b07328-8be8-4d95-9a3e-54efb12c1afa`.
Its source authority is the checksum-pinned artifact at
`/Users/ylsuen/CF/backups/mf/2026-07-26/reading-frame-navigation/candidate-artifact-v4` with manifest
`candidate-v4-sha256.txt`. Live data, CSS and JavaScript hashes match that manifest; live HTML differs
only because Cloudflare injects email-obfuscation markup. Commit `c60c76f` records that exact artifact
in Git before the 2026 content commit. The canonical dirty worktree is not deployment authority.

## 2026 Beijing contract

- GKS coverage SHA-256: `c6171cc5bdbf4032cf940734a0a5c0e6d60e35adc7585131006036def204a593`.
- Source scan SHA-256: `486b6c54ca01653daf9bd2a87d8e69129cd688002a932923005a7109331669ec`.
- `data/poems.json` and `data/poems.ad0aad72.json` are byte-identical, SHA-256
  `ad0aad7245517e84d49fe967c6207ed07df51bd6c9c4c483d770336f1eaa1f50`.
- `js/script.js` and `js/script.5d5119fe.js` are byte-identical, SHA-256
  `5d5119fed260e90b128c82845256456e0a9e5a1c578ee2396a8a03adbab06220`.
- The four exact answers are attributed to `OpenAI Codex (GPT-5)` and displayed as non-official.
  Question 14(2) is correctly `战不善 / 弊在赂秦`, confirmed from source page 6.

No new Cloudflare capability, binding, route, identity, data store or shared-hub contract is introduced.

## Verification, deploy and rollback

1. Use Node 24.18.0; run `npm test`, `node --check` for both JavaScript files, `jq empty` for both data
   files, exact hash parity and `git diff --check`.
2. Push the clean branch and run the normal workspace deploy gate without override.
3. Construct a task-isolated artifact containing only `index.html`, `Fonts`, `bg.webp`, `css`, `js` and
   `data`; record its manifest and verify it against the committed source.
4. Deploy that artifact to Pages project `mf`, branch `main`, binding the exact Git commit.
5. Read back root, hashed CSS/JS/data, verify hashes and confirm the four 2026 entries and visible model
   attribution. Verify User Center and navigation dependencies remain HTTP 200.

Rollback by promoting deployment `24b07328-8be8-4d95-9a3e-54efb12c1afa`, then repeat the root, asset,
data and dependency readbacks. Static rollback does not mutate student progress or shared services.

Last verified: 2026-08-16. The normal Git gate passed without override at pushed commit
`8ca8d77d70c077d95fcd26ef0717938042522535`; Pages production deployment
`196c6dc7-ff25-49d5-a5ba-af8843fb31de` is live. The public data, JavaScript and CSS SHA-256 values
exactly match the committed hash-pinned artifact. The root references the new JavaScript, all four
2026 entries are present, and the User Center and navigation dependencies returned HTTP 200.
