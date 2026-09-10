## 2026-09-10 00:52Z：修復已上線，真實閱讀與 My 重載通過

正式 Pages `5f53e801-27e7-4ac5-81e7-2372cf5062bc`，執行來源 `c81ce3f96751ce5a8c1bef18c7aa3dc6f92eb2c0`，程式 `script.4906f6b1.js`。預覽 `04001854-db89-4f7a-8f3f-5d9ab3f4049e` 的 11 個檔案完全相符；正式站 10 個非 HTML 檔案相符，首頁只多出 Cloudflare 的同站隱藏 nofollow 連結及電郵保護。精確移除該連結、還原已核對的原電郵連結並移除指定解碼程式後，整份 HTML 與產物逐位相同。保留最初失敗的原始雜湊收據，沒有任意忽略 HTML 或關閉安全設定。正式設定未變，沒有其他發布者。

已登入使用者原有 36 筆中央 MF 紀錄，修復前在同源靜態圖片頁讀取本機基線，避免舊程式啟動同步。新版載入後完整恢復這 36 筆，中央雜湊未變。於 00:49:54Z 正常點開第 29 篇《滕王閣序》，只發出一筆寫入，收到 `ok:true`、`mf/poem-29` 的正向回執。普通重載 MF 與 My 後，兩邊各有 37 筆；新增紀錄與回執雜湊一致，原 36 筆中央及已恢復本機紀錄逐項未变。My 正常「學習記錄」頁可見該篇。不得重播這次驗收操作。

這項真實流程已通過；自然匿名流量的 401 與寫入失敗是否下降仍未驗收。舊資料中的錯誤 synced 標記沒有批次重寫，歷史受影響數仍未知。MF 通用進度是 `record_only`，不冒充合格學習證據或新增積分。GK 的匿名進度讀取、UC 限流候選版回退與其他 My／機隊目標仍另案未完成。

回退錨點仍為 Pages `196c6dc7-ff25-49d5-a5ba-af8843fb31de`／來源 `8ca8d77d70c077d95fcd26ef0717938042522535`；保留新增及既有學習紀錄。任何回退先確認目前正式版本及操作擁有權。所有發布程序已有終端收據，不得重播 `mf-progress-pages-release.mjs` 的預覽或正式呼叫。

接手先讀 E7（下方完整路徑）中的 `mf-progress-real-owner-acceptance.json`、`mf-progress-production-deployment.json`、`mf-progress-production-readback-reviewed.json`、`mf-progress-owner-baseline.json`、`mf-progress-owner-hydrated.json`、`mf-progress-owner-after.json`、`mf-progress-normal-owner-read.json`、`mf-progress-my-ui-after-reload.json`。中央同步收據是 `reports/operations/shared_hub_changes/2026-09-10-mf-progress-sync-recovery.json`。此文件提交只發布至既有分支，使用 CF-Pages-Skip，不會改變上述執行來源或 Pages ID。

## 發布前規格與本機驗證（現況以上方為準）

獨立交易 `20260910-mf-progress-sync-recovery`，執行者 `codex-my-architecture-serial7`。00:26Z 控制面與檔案讀回確認：正式環境為 Pages `196c6dc7-ff25-49d5-a5ba-af8843fb31de`，來源 `8ca8d77d70c077d95fcd26ef0717938042522535`，線上 `script.5d5119fe.js` 與 Git 完全一致。Git main 的 `182f4048` 早於正式環境；本次從已發布的正式版本歷史 `341fbe214dcbb6e542b80d72cf0d1b6bf62c53fe` 接續，禁止盲目部署舊 main。原始目錄內兩份未提交的儲存稽核文件保持不動。

已證實的程式缺陷：首頁未確認登入就讀取受保護進度；寫入收到 401 或尚未啟用遠端同步時，呼叫者仍可能標記 `synced:true`。新程式先使用既有 `BdfzIdentity.getSession()`，只有中央回執 `ok:true` 且 `siteKey/itemKey` 符合才確認同步。失敗批次停止，保留本機待同步資料及原始時間；重新載入、回到本頁或再點待同步篇目時可重試。並行載入共用同一請求，第一次閱讀不重複寫入，失敗後也不立即重送。新增有限狀態日誌，不輸出篇目內容、帳戶或原始錯誤。

篇目資料、ID、排序、CSS、字型、My 請求契約、登入、分數與儲存鍵均不變。新版 `js/script.js` 與 `js/script.4906f6b1.js` 完全相同，SHA256 `4906f6b1bd31764d2414f93505d4f60245c4f0f822eecc45a8ef841ee0b18973`。歷史上已錯標「同步」的紀錄沒有批次改寫：舊本機資料沒有帳戶歸屬證據，不能推測它們屬於當前帳戶。GK 的同類初始讀取與 UC 候選版裁定另案處理。

Node 24.18.0 下，12 項行為測試、既有北京 2026 內容檢查、語法與差異檢查通過。涵蓋匿名、登入返回、401／503／網路失敗、錯誤回執、重載恢復、並行及重複提交。相同測試在原正式來源重現缺陷。這些仍是本機證據；發布後必須驗收真實閱讀操作、中央 MF 紀錄、My 與來源頁普通重載，並另外量測自然 401／寫入錯誤是否下降。

沿用手冊既有的受限靜態產物發布方式：只包含 `index.html`、`Fonts`、`bg.webp`、`css`、`js`、`data`，先預覽再正式發布。正常 Git 閘門、完整測試與精確提交綁定都必須通過。來源及文件提交使用官方 `[CF-Pages-Skip]` 前綴，避免 Git 整合另行上傳整個倉庫；這不是略過測試或部署閘門，也不改動專案設定。[官方依據](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message)。本次沒有新增平台能力、依賴、資源、費用層級或憑證。

本次即時回退錨點為 `196c6dc7`／來源 `8ca8d77`；回退前重新核實目前部署與擁有權，保留全部向前累積的 My／本機進度。來源可由既有 Git object store 在不存在的、已登錄目錄建立指定提交的 worktree，先比對檔案雜湊再使用。不得複製第二份倉庫或藉此刪除舊備份。

證據位於 `/Users/ylsuen/CF/_meta/reports/operations/.my-architecture-serial7-20260909`：`mf-gk-progress-live-source-audit.json`、`mf-progress-recovery-spec.md`、`mf-progress-recovery-source.json`、`mf-progress-current.log`、`mf-progress-predecessor-regression.log`。保留方式 `retain_hot`，檢視日期 2026-09-16，並非刪除期限。暫存 worktree 為 `/private/tmp/cf-task-20260909-my-architecture-serial7/mf-progress-recovery`；發布與回復證據齊備後，按根任務 manifest 精確清理。下方舊備份的還原缺口仍未驗收。

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
