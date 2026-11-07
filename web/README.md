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

## Cloudflare Pages (Git)

Use repository subdirectory **`web`** as the Pages project root. Dashboard settings (or `wrangler.toml` in this folder once linked):

| Setting | Value |
|---------|--------|
| Root directory | `web` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` (`.node-version`; override with env `NODE_VERSION` if needed) |

`wrangler.toml` sets `pages_build_output_dir = "./dist"` and project name `ccc-government-aid`. If your Cloudflare project name differs, update `name` to match.

After setup, each push to the connected branch builds and deploys automatically. SPA fallback: Cloudflare Pages serves `index.html` for unknown routes when there is no `404.html`; Workers / `wrangler preview` use `[assets].not_found_handling` in `wrangler.toml`. Cache hints: `public/_headers`.

## Cloudflare Pages (CLI)

From this directory, after `wrangler login`:

```sh
npm run cf:pages:deploy
```

Runs production build then `wrangler pages deploy dist`. Do not run in CI against production unless intended (see repo `AGENTS.md`).

## Workers Preview (`wrangler preview` open beta)

Requires `[assets]` and `[previews]` in `wrangler.toml` (not just `pages_build_output_dir`). Do not use `/* /index.html 200` in `_redirects` with Workers static assets—it fails validation (code 100324).

```sh
npm run cf:wrangler:preview
```

Static assets include PingFangTC and Roboto under `public/fonts/`. Database and filter behavior are stubs; see `src/services/`.
