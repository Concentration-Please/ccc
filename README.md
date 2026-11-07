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

從[臺北市政府原住民族事務委員會的「為民服務」](https://www.ipc.gov.taipei/Content_List.aspx?n=082798040B8AF70C)抓取所有分類與同站網頁，排除「本會場地租借」。逐篇正文交給 OpenRouter 的 `google/gemma-4-26b-a4b-it`，擷取個人、家庭或團體可申請的補助、津貼、費用減免及免費服務；跨站網頁連結不解析。

需要 Node.js 22 以上與 OpenRouter API key：

```sh
cp .dev.vars.example .dev.vars
# 將 .dev.vars 內的 OPENROUTER_API_KEY 換成你的金鑰
npm run parse
```

`.dev.vars` 是 Cloudflare Workers 本機開發使用的 secret 檔，已被 Git 忽略。現有 Node.js 批次程式也會讀取它；未來接入 Worker 時，金鑰需透過 Worker 的 secret binding 傳入。

完整抓取會對每篇有正文的網頁呼叫付費模型，不做關鍵字初篩；只有附件而無正文的頁面會略過。程式依序處理網頁，每篇完成後將結果寫入 `data/indigenous.json`，並將續跑狀態寫入 Git 忽略的 `tmp/ipc-parser-state.json`。重新執行會重抓網頁內文，但內容與抽取版本未變時不再呼叫模型。網站或模型暫時失敗時會有限次重試；仍失敗的網頁列在輸出檔 `errors`，程式以非零狀態結束，下次執行會重試。

附件原檔存於 Git 忽略的 `tmp/ipc-attachments/`，來源網址、標題及檔名索引存於 `tmp/ipc-attachments.json`。目前模型只讀網頁正文；附件內容不送模型。

`data/indigenous.json` 頂層包含 `source`、`generated_at`（UTC）、`updated_at`（GMT+8，每次寫檔更新）、`complete`、`records`、`errors`。每個 `records` 項目有十一個欄位：

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

驗證 parser：

```sh
npm test
npm run typecheck
```
