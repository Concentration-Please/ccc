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

Dashboard settings (or [`wrangler.toml`](wrangler.toml) when linked):

| Setting | Value |
|---------|--------|
| Root directory | *(leave blank)* |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler preview` |
| Node.js version | `22` (`.node-version`; or env `NODE_VERSION`) |

Build output is `dist/` via `pages_build_output_dir` and `[assets].directory` in `wrangler.toml`. Project name in Cloudflare: `name = "ccc"` in `wrangler.toml`.

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
