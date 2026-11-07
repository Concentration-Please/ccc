# 臺北市原民會為民服務 Parser

從[臺北市政府原住民族事務委員會的「為民服務」](https://www.ipc.gov.taipei/Content_List.aspx?n=082798040B8AF70C)抓取所有分類與同站網頁，排除「本會場地租借」。逐篇正文交給 OpenRouter 的 `google/gemma-4-26b-a4b-it`，擷取個人、家庭或團體可申請的補助、津貼、費用減免及免費服務；頁面附件另行下載，跨站網頁連結不解析。程式只包含後端批次處理，沒有前端。

## 執行

需要 Node.js 22 以上與 OpenRouter API key：

```sh
npm install
cp .dev.vars.example .dev.vars
# 將 .dev.vars 內的 OPENROUTER_API_KEY 換成你的金鑰
npm run parse
```

`.dev.vars` 是 Cloudflare Workers 本機開發使用的 secret 檔，已被 Git 忽略。現有 Node.js 批次程式也會讀取它；未來接入 Worker 時，金鑰需透過 Worker 的 secret binding 傳入。

完整抓取會對每篇有正文的網頁呼叫付費模型，不做關鍵字初篩；只有附件而無正文的頁面會略過。程式依序處理網頁，每篇完成後將結果寫入 `data/subsidies.json`，並將續跑狀態寫入 Git 忽略的 `tmp/ipc-parser-state.json`。執行時會覆寫先前衛生局來源產生的 `data/subsidies.json`；重新執行會重抓網頁內文，但內容與抽取版本未變時不再呼叫模型。網站或模型暫時失敗時會有限次重試；仍失敗的網頁列在輸出檔 `errors`，程式以非零狀態結束，下次執行會重試。

附件原檔存於 Git 忽略的 `tmp/ipc-attachments/`，來源網址、標題及檔名索引存於 `tmp/ipc-attachments.json`。目前模型仍只讀網頁正文；附件內容的擷取與送模型尚未接入。

欄位改版後，舊版續跑狀態不相容；下一次執行 `npm run parse` 會重新呼叫模型並覆寫既有結果。

## 結果格式

`data/subsidies.json` 包含 `source`、`generated_at`（UTC）、`updated_at`（GMT+8，每次寫檔更新）、`complete`、`records`、`errors`。每個 `records` 項目代表一個網頁中的一項服務及一組資格；同一方案有不同申請資格時分成多筆，跨網頁不合併。

- `category`：網站「為民服務」最上層分類名稱；子分類文章沿用其所屬的最上層分類。
- `is_organization`：團體或機構為實際受益／申請者時為 `true`；個人或家庭為 `false`。
- `registration_months`：受益／申請者本人明確要求的最短設籍月數，否則為 `null`；設籍地及其他角色的設籍限制仍保留在 `conditions`。
- `source_url`：原始公告或服務網頁連結，由程式填入。
- `name`：取自原文的補助名稱，可截短但不改寫語意。
- `summary`：一句話摘要。
- `subsidy_target`：詳細記錄補助的費用、物品、服務、活動與明確的金額、頻率或上限。
- `conditions`：各項明確資格與限制，每個獨立條件為一個字串，保留適用對象及原文細節。


## 驗證

```sh
npm test
npm run typecheck
```
