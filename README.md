# 政府援助

給 TownPass WebView 使用的臺北市政府補助清單。

## 服務內容簡介

補助公告散在各局處網站，民眾不容易一次看完、也不知道哪些跟自己有關。這個服務把臺北市原住民族事務委員會「為民服務」與青年局「補助貸款」的公告整理成同一份清單。

使用者可以搜尋，並依年齡、身分別、設籍時間、團體或個人篩選。訂閱條件存在自己的裝置上；之後若有符合的新補助，會透過 TownPass 通知。

清單資料事先整理好，放在 `data/indigenous.json` 與 `data/youth.json`。開啟網頁時不會再呼叫模型。

## 如何開啟服務

需要 Node.js 22。

```sh
npm install
npm run dev
```

瀏覽器打開終端機印出的網址，預設是 http://localhost:5173/ 。一般瀏覽使用現有資料，不需要 API key。

要部署到 Cloudflare，先 `npm run build`，再執行 `npm run cf:pages:deploy` 或 `npm run cf:wrangler:preview`。

## AI 使用模型

資料整理使用 OpenRouter 上的 `google/gemma-4-26b-a4b-it`（見 `src/extract.ts` 的 `MODEL_ID`）。

`npm run parse` 會抓取原民會與青年局網頁，抽出補助名稱、對象、年齡、設籍與申請方式，再依摘要分類、貼上標籤。只重做分類可執行 `npm run classify`。金鑰放在 `.dev.vars` 的 `OPENROUTER_API_KEY`，由 `.dev.vars.example` 複製。這一步會呼叫付費模型；平常開啟服務不會。

## License

本專案的程式以 [GNU Affero General Public License v3.0 only](LICENSE)（SPDX: `AGPL-3.0-only`）授權。再散布時須附上同一授權，並提供對應原始碼；透過網路提供這個服務時，也要讓使用者取得對應原始碼。原始碼即這個 GitHub 儲存庫。

第三方套件、字型與資料來源的說明見 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。政府公告不受著作權保護；蘋方（PingFangTC）是 TownPass 要求的字型，本專案假設可以使用。
