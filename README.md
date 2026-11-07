# Government aid list (TownPass WebView)

Vue 3 SPA for listing government assistance programs. Intended for loading inside the TownPass mobile app WebView and hosting on Cloudflare.

## Local development

From the repository root:

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Cloudflare (Git / Workers Builds)

Set these commands in the Cloudflare dashboard under **Settings > Builds**. Production and Previews Base have separate build settings; [`wrangler.toml`](wrangler.toml) does not set the Workers Builds commands.

| Setting | Production | Previews Base |
|---------|------------|---------------|
| Root directory | `/` (repository root) | `/` (repository root) |
| Build command | `npm run build` | `npm run build` |
| Deploy / Preview command | `npx wrangler deploy` | `npx wrangler preview` |

Workers Builds installs dependencies before running the build command. Use Node.js 22 (`.node-version`; or env `NODE_VERSION`). Both build commands must create `dist/` before Wrangler runs. The output directory is configured by `pages_build_output_dir` and `[assets].directory` in `wrangler.toml`. Project name in Cloudflare: `name = "ccc"` in `wrangler.toml`.

SPA fallback: `[assets].not_found_handling = "single-page-application"` for Workers preview; Pages has no `404.html` so unknown routes fall back to `index.html`. Cache hints: `public/_headers`.

## Cloudflare Pages (CLI)

After `wrangler login`:

```sh
npm run cf:pages:deploy
```

Runs production build then `wrangler pages deploy dist`. See repo [`AGENTS.md`](AGENTS.md).

## Workers Preview (`wrangler preview` open beta)

Requires `[assets]` and `[previews]` in `wrangler.toml`. Do not use `/* /index.html 200` in `_redirects` with Workers static assets (error 100324).

```sh
npm run cf:wrangler:preview
```

Static assets: PingFangTC and Roboto under `public/fonts/`. Database and filter stubs: `src/services/`.

## 原民會為民服務 Parser

從[臺北市政府原住民族事務委員會的「為民服務」](https://www.ipc.gov.taipei/Content_List.aspx?n=082798040B8AF70C)抓取分類與同站網頁，排除「為民服務」、場地租借及空間借用分類。逐篇正文交給 OpenRouter 的 `google/gemma-4-26b-a4b-it`，擷取個人、家庭或團體可申請的補助、津貼、費用減免及免費服務；跨站網頁連結不解析。

需要 Node.js 22 以上與 OpenRouter API key：

```sh
cp .dev.vars.example .dev.vars
# 將 .dev.vars 內的 OPENROUTER_API_KEY 換成你的金鑰
npm run parse
```

`.dev.vars` 是 Cloudflare Workers 本機開發使用的 secret 檔，已被 Git 忽略。現有 Node.js 批次程式也會讀取它；未來接入 Worker 時，金鑰需透過 Worker 的 secret binding 傳入。

完整抓取會對有正文或可讀附件文字的網頁呼叫付費模型，不做關鍵字初篩。每次執行會先刪除該 parser 的舊輸出、狀態及附件，再重新抓取與抽取；程式依序處理網頁，每篇完成後將結果寫入 `data/indigenous.json`，並將當次進度寫入 Git 忽略的 `tmp/ipc-parser-state.json`。網站或模型暫時失敗時會有限次重試；仍失敗的網頁列在輸出檔 `errors`，程式以非零狀態結束，下次執行會從頭重跑。

同一篇文章中，模型輸出的欄位完全相同時只保留第一筆；同頁的不同補助仍各自輸出。不同文章的紀錄分別保留來源網址。

附件原檔存於 Git 忽略的 `tmp/ipc-attachments/`，來源網址、標題及檔名索引存於 `tmp/ipc-attachments.json`。Parser 會擷取 PDF、ODT、ODS、DOCX 的文字，連同附件標題送給模型；每份附件最多取 8,000 字，每篇合計最多 24,000 字。掃描影像 PDF 與舊版 DOC 無法直接讀取文字，會記錄提示並保留原檔。

`data/indigenous.json` 頂層包含 `source`、`generated_at`（UTC）、`updated_at`（GMT+8，每次寫檔更新）、`complete`、`records`、`errors`。每個 `records` 項目有十三個欄位：

- `id`：每份 JSON 的 `records` 依輸出順序從 1 開始編號，不交給模型生成；增刪或重新排序紀錄時，後續 ID 會改變。
- `category`：網站「為民服務」最上層分類名稱；子分類文章沿用最上層分類。
- `is_organization`：團體或機構為實際受益／申請者時為 `true`；個人或家庭為 `false`。
- `registration_months`：受益／申請者本人明確要求的最短設籍月數，否則為 `null`；其他設籍限制保留在 `conditions`。
- `age_lower`、`age_upper`：受益／申請者本人明示的年齡下限與上限（歲），未明示時為 `null`；不從年級或就學階段推算。
- `isNative`：正文明確要求受益／申請者具原住民身分時為 `true`，否則為 `false`。
- `source_url`：原始公告或服務網頁連結。
- `name`：取自原文的補助名稱，可截短但不改寫語意。
- `summary`：一句話摘要。
- `subsidy_target`：詳細的補助標的、金額、頻率或上限。
- `conditions`：各項明確資格與限制，每個獨立條件為一個字串。
- `application_method_or_documents`：正文或可讀附件提到的申請方式、送件步驟或應備文件；未提及時為空陣列。

驗證 parser：

```sh
npm test
npm run typecheck
```

## 青年局補助貸款 Parser

從[臺北市政府青年局的「補助貸款」](https://youth.gov.taipei/services/05eb79e5-46b5-41e5-b1fd-0519d782b04a)擷取列表及各篇正文，使用相同的 OpenRouter 模型和 `records` 欄位，輸出至 `data/youth.json`：

```sh
npm run parse:youth
```

青年局資料的 `category` 從原住民資料現有分類及新增的「其他」中選擇；每筆補助獨立分類。網頁正文與頁面直接連結的可讀附件文字會送模型，其他外部網頁內容不解析。每次執行同樣會清除青年局的舊輸出與暫存；當次進度與附件索引分別存於 Git 忽略的 `tmp/youth-parser-state.json`、`tmp/youth-attachments.json`，與原住民 parser 分開。
