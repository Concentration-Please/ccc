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

`data/subsidies.json` 包含 `source`、`generated_at`、`complete`、`records`、`errors`。每個 `records` 項目代表一個網頁中的一項服務及一組資格；同一方案有不同申請資格時分成多筆，跨網頁不合併。

- `name`：補助或免費服務名稱。
- `beneficiary_type`：實際受益者為 `individual`、`family`、`organization` 或 `unspecified`；`application_process` 以文字記錄誰有申請權、誰遞件與誰請款。
- `age_min_months`、`age_max_months`：整數月的年齡門檻；`age_min_inclusive`、`age_max_inclusive` 表示是否包含門檻。只有學籍或年級時，年齡欄位為 `null`，資格寫在 `school_stage`。
- `indigenous_requirement`：個人的原住民身分限制，為 `required`、`excluded`、`not_required`（明確不限）或 `unspecified`（未說明或團體申請）。
- `gender_restriction`：`male_only`、`female_only`、`none`（明確不限）或 `unspecified`（未說明）。
- `registered_in`、`registration_min_months`、`actual_residence_required`：設籍地、設籍月數、是否要求實際居住；未提及時為 `null`。
- `income_requirement`、`other_requirements`：原文的所得門檻及其他資格。`other_requirements` 的每項條件包含 `subject` 和 `text`，可區分受益者、申請人、家庭、團體、代表人、活動參與者及服務機構。
- `benefit_detail`、`application_period`、`required_documents`：補助內容／金額、申請期間及應備文件。
- `source_kind`：`service_detail`（服務說明）、`faq`（問答或摘要）、`amendment`（修正公告）、`attachment_rule`（附件要點／計畫）、`attachment_form`（附件表單）；`source_version` 保留文件標註的版本或生效日期。
- `evidence`：每項包含原文 `quote`、`source_url` 與 `source_title`，能對應到網頁或特定附件。年級或出生年度等無法可靠換算的資格也保留在原文引文。
- `source_url`、`article_title`、`published_at`：來源網址、網頁標題與發布日期，供人工查證。未提供發布日期的頁面以 `null` 表示；程式不判定歷史公告是否仍有效。


## 驗證

```sh
npm test
npm run typecheck
```
