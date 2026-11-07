# 臺北市衛生局補助新聞稿 Parser

從[臺北市政府衛生局新聞稿](https://health.gov.taipei/News.aspx?n=BB5A41BA1E6CA260&sms=72544237BBE4C5F6&page=1&PageSize=200)抓取所有頁面與文章。標題或內文包含「疫苗」或「免費」時，逐篇交給 OpenRouter 的 `google/gemma-4-26b-a4b-it`，擷取民眾可使用的公費疫苗、免費健康服務與補助。純宣導、自費資訊不產生補助記錄。程式只包含後端批次處理，沒有前端。

## 執行

需要 Node.js 22 以上與 OpenRouter API key：

```sh
npm install
OPENROUTER_API_KEY=你的金鑰 npm run parse
```

完整抓取會呼叫付費模型。程式依序處理文章，每篇完成後將結果寫入 Git 忽略的 `tmp/subsidies.json`，並將續跑狀態寫入 `tmp/parser-state.json`。重新執行會重抓文章內文，但內容與抽取版本未變時不再呼叫模型。網站或模型暫時失敗時會有限次重試；仍失敗的文章列在輸出檔 `errors`，程式以非零狀態結束，下次執行會重試。

## 結果格式

`tmp/subsidies.json` 包含 `source`、`generated_at`、`complete`、`records`、`errors`。每個 `records` 項目代表一篇文章中的一項補助及一組資格；同一方案有不同族群門檻時分成多筆，跨文章不合併。

- `name`：補助或免費服務名稱。
- `age_min_months`、`age_max_months`：整數月；原文沒有可換算的數值年齡時為 `null`。
- `age_min_inclusive`、`age_max_inclusive`：界線是否包含該月；對應年齡為 `null` 時也為 `null`。
- `indigenous_requirement`：`required`、`excluded`、`not_required`（明確不限）或 `unspecified`（未說明）。
- `gender_restriction`：`male_only`、`female_only`、`none`（明確不限）或 `unspecified`（未說明）。
- `evidence_quotes`：從文章內文逐字擷取的原文；年級或出生年度等無法可靠換算的資格也保留在此。
- `source_url`、`article_title`、`published_at`：來源與發布日期，供人工查證。程式不判定歷史公告是否仍有效。

關鍵字篩選嚴格使用「疫苗」或「免費」；未包含兩詞的文章不會進入模型。

## 驗證

```sh
npm test
npm run typecheck
```
