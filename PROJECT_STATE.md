## 2026-09-10：閱讀進度同步修復，尚未部署

獨立交易 `20260910-mf-progress-sync-recovery`，執行者 `codex-my-architecture-serial7`。00:26Z 控制面與檔案讀回確認：正式環境為 Pages `196c6dc7-ff25-49d5-a5ba-af8843fb31de`，來源 `8ca8d77d70c077d95fcd26ef0717938042522535`，線上 `script.5d5119fe.js` 與 Git 完全一致。Git main 的 `182f4048` 早於正式環境；本次從已發布的正式版本歷史 `341fbe214dcbb6e542b80d72cf0d1b6bf62c53fe` 接續，禁止盲目部署舊 main。原始目錄內兩份未提交的儲存稽核文件保持不動。

已證實的程式缺陷：首頁未確認登入就讀取受保護進度；寫入收到 401 或尚未啟用遠端同步時，呼叫者仍可能標記 `synced:true`。新程式先使用既有 `BdfzIdentity.getSession()`，只有中央回執 `ok:true` 且 `siteKey/itemKey` 符合才確認同步。失敗批次停止，保留本機待同步資料及原始時間；重新載入、回到本頁或再點待同步篇目時可重試。並行載入共用同一請求，第一次閱讀不重複寫入，失敗後也不立即重送。新增有限狀態日誌，不輸出篇目內容、帳戶或原始錯誤。

篇目資料、ID、排序、CSS、字型、My 請求契約、登入、分數與儲存鍵均不變。新版 `js/script.js` 與 `js/script.4906f6b1.js` 完全相同，SHA256 `4906f6b1bd31764d2414f93505d4f60245c4f0f822eecc45a8ef841ee0b18973`。歷史上已錯標「同步」的紀錄沒有批次改寫：舊本機資料沒有帳戶歸屬證據，不能推測它們屬於當前帳戶。GK 的同類初始讀取與 UC 候選版裁定另案處理。

Node 24.18.0 下，12 項行為測試、既有北京 2026 內容檢查、語法與差異檢查通過。涵蓋匿名、登入返回、401／503／網路失敗、錯誤回執、重載恢復、並行及重複提交。相同測試在原正式來源重現缺陷。這些仍是本機證據；發布後必須驗收真實閱讀操作、中央 MF 紀錄、My 與來源頁普通重載，並另外量測自然 401／寫入錯誤是否下降。

沿用手冊既有的受限靜態產物發布方式：只包含 `index.html`、`Fonts`、`bg.webp`、`css`、`js`、`data`，先預覽再正式發布。正常 Git 閘門、完整測試與精確提交綁定都必須通過。來源及文件提交使用官方 `[CF-Pages-Skip]` 前綴，避免 Git 整合另行上傳整個倉庫；這不是略過測試或部署閘門，也不改動專案設定。[官方依據](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message)。本次沒有新增平台能力、依賴、資源、費用層級或憑證。

本次即時回退錨點為 `196c6dc7`／來源 `8ca8d77`；回退前重新核實目前部署與擁有權，保留全部向前累積的 My／本機進度。來源可由既有 Git object store 在不存在的、已登錄目錄建立指定提交的 worktree，先比對檔案雜湊再使用。不得複製第二份倉庫或藉此刪除舊備份。

證據位於 `/Users/ylsuen/CF/_meta/reports/operations/.my-architecture-serial7-20260909`：`mf-gk-progress-live-source-audit.json`、`mf-progress-recovery-spec.md`、`mf-progress-recovery-source.json`、`mf-progress-current.log`、`mf-progress-predecessor-regression.log`。保留方式 `retain_hot`，檢視日期 2026-09-16，並非刪除期限。暫存 worktree 為 `/private/tmp/cf-task-20260909-my-architecture-serial7/mf-progress-recovery`；發布與回復證據齊備後，按根任務 manifest 精確清理。下方舊備份的還原缺口仍未驗收。

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
