# Government aid list (TownPass WebView)

Vue 3 SPA for listing government assistance programs. Intended for loading inside the TownPass mobile app WebView and hosting on Cloudflare Pages.

## Local development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Root directory | `web` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | 20 LTS (or current LTS) |

Static assets include PingFangTC (from TownPass) and Roboto under `public/fonts/`. Database and filter behavior are stubs; see `src/services/`.
