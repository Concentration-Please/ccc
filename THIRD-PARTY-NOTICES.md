# 第三方授權標示

本專案程式以 AGPL-3.0-only 授權，見 [LICENSE](LICENSE)。這份文件標示程式以外、或由他人授權的材料。npm 套件的版本與授權取自 `package-lock.json` 的頂層 `node_modules/<name>` 項目；巢狀重複安裝不另列，以 lockfile 為準。

掃描時沒有看到 `UNLICENSED`、`CC-BY-NC`、Commons Clause，或授權欄位寫著 “personal use only”／「僅供個人使用」的 npm 套件。依下面兩項判斷，本專案沒有把蘋方或政府公告列為不得再散布的材料。

這些是開源授權。它們和 AGPL-3.0 可以併用，但要守各授權自己的條件。

### Roboto

`public/fonts/Roboto-Regular.woff2`、`Roboto-Medium.woff2`、`Roboto-SemiBold.woff2` 是 Apache-2.0。著作權屬 Google。可再散布，須保留著作權與授權聲明。與 AGPL-3.0 相容。

### 有附加義務的傳遞依賴

| 套件 | 版本 | 授權 | 義務 |
| --- | --- | --- | --- |
| lightningcss 與其平台包 | 1.33.0 | MPL-2.0 | 建置時使用，不進瀏覽器 bundle。修改這些檔案本身須維持 MPL-2.0。 |
| @img/sharp-libvips-\*（10 個平台包） | 1.3.4 | LGPL-3.0-or-later | 原生建置依賴，不進瀏覽器 bundle。散布這個函式庫時須讓使用者能換成自己的版本。 |
| @img/sharp-win32-arm64、ia32、x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | 同上，Windows 平台包。 |
| @img/sharp-wasm32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT | 同上。 |
| caniuse-lite | 1.0.30001823 | CC-BY-4.0 | 再散布須保留姓名標示。 |

lightningcss 平台包：`lightningcss-android-arm64`、`lightningcss-darwin-arm64`、`lightningcss-darwin-x64`、`lightningcss-freebsd-x64`、`lightningcss-linux-arm-gnueabihf`、`lightningcss-linux-arm64-gnu`、`lightningcss-linux-arm64-musl`、`lightningcss-linux-x64-gnu`、`lightningcss-linux-x64-musl`、`lightningcss-win32-arm64-msvc`、`lightningcss-win32-x64-msvc`。

libvips 平台包：`@img/sharp-libvips-darwin-arm64`、`darwin-x64`、`linux-arm`、`linux-arm64`、`linux-ppc64`、`linux-riscv64`、`linux-s390x`、`linux-x64`、`linuxmusl-arm64`、`linuxmusl-x64`。

### 雙授權，可選與 GPL 相容的一側

| 套件 | 版本 | 授權 | 本專案採用 |
| --- | --- | --- | --- |
| jszip | 3.10.2 | MIT OR GPL-3.0-or-later | GPL-3.0-or-later 這一側 |
| wrangler | 4.158.0 | MIT OR Apache-2.0 | 兩者皆與 AGPL-3.0 相容 |
| @cloudflare/kv-asset-handler | 0.5.0 | MIT OR Apache-2.0 | 同上 |
| @cloudflare/unenv-preset | 2.16.2 | MIT OR Apache-2.0 | 同上 |
| json-schema | 0.4.0 | AFL-2.1 OR BSD-3-Clause | BSD-3-Clause 這一側 |
| pako | 1.0.11 | MIT AND Zlib | 兩個授權的條件都保留 |

## 直接依賴

`package.json` 直接宣告的套件。除了上面已標出的 jszip、wrangler，其餘為 MIT 或 Apache-2.0，與 AGPL-3.0 相容。Apache-2.0 的套件再散布時須保留其著作權與授權聲明。

| 套件 | 版本 | 授權 |
| --- | --- | --- |
| @openrouter/ai-sdk-provider | 3.1.0 | Apache-2.0 |
| @tsconfig/node24 | 24.0.5 | MIT |
| @types/node | 24.19.2 | MIT |
| @vitejs/plugin-vue | 6.0.10 | MIT |
| @vue/eslint-config-typescript | 14.9.0 | MIT |
| @vue/tsconfig | 0.9.1 | MIT |
| ai | 7.0.164 | Apache-2.0 |
| cheerio | 1.2.0 | MIT |
| eslint | 10.14.0 | MIT |
| eslint-config-prettier | 10.1.8 | MIT |
| eslint-plugin-oxlint | 1.82.0 | MIT |
| eslint-plugin-vue | 10.11.1 | MIT |
| jiti | 2.7.0 | MIT |
| jszip | 3.10.2 | MIT OR GPL-3.0-or-later |
| npm-run-all2 | 9.0.4 | MIT |
| oxlint | 1.82.0 | MIT |
| pdfjs-dist | 4.10.38 | Apache-2.0 |
| prettier | 3.9.6 | MIT |
| tsx | 4.23.15 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| vite | 8.3.6 | MIT |
| vite-plugin-vue-devtools | 8.2.1 | MIT |
| vue | 3.5.45 | MIT |
| vue-eslint-parser | 10.4.2 | MIT |
| vue-router | 5.4.0 | MIT |
| vue-tsc | 3.3.14 | MIT |
| wrangler | 4.158.0 | MIT OR Apache-2.0 |
| zod | 4.6.7 | MIT |

## 專案內沒有另附授權的素材

`src/assets/` 的 SVG 圖示為製作團隊繪製的圖形，視為本專案的一部分，隨 [LICENSE](LICENSE) 以 AGPL-3.0-only 授權。
