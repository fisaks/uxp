# Adding a Remote App

A practical checklist for adding a new remote app (UI + BFF) to the monorepo and running it
in development. It was written while adding `aud` (audio) and uses `demo-*` as the template.

For the concepts behind each step see [Remote app contract](./remote-app-contract.md),
[Remote app runtime](./remote-app-runtime.md) and [Platform config](./platform-config.md).
For production see [Deployment guide](./deployment-guide.md#adding-a-new-remote-app).

Below, `xyz` stands for your app's identifier.

---

## 1. Choose names, ports and route

| Item | Convention | Example (`aud`) |
|---|---|---|
| Identifier | short, lowercase, used as `contextPath` | `aud` |
| Packages | `xyz-ui`, `xyz-bff`, optional `xyz-common` | `aud-ui`, `aud-bff` |
| npm names | `@xyz/ui`, `@xyz/bff`, `@xyz/common` | `@aud/ui`, `@aud/bff` |
| UI dev port | next free `30N0` | `3040` |
| BFF port | UI port + 1 | `3041` |
| UXP route | what the user sees in the URL | `/audio/*` |

Ports in use:

| App | UI | BFF |
|---|---|---|
| uxp | 3000 | 3001 |
| h2c | 3010 | 3011 |
| demo | 3020 | 3021 |
| uhn | 3030 | 3031 (master) |
| aud | 3040 | 3041 |

---

## 2. Create the packages

Copy from `demo-bff` / `demo-ui` and delete what the app does not need. Keep the files below;
the demo's chat, binary and rich-text features are examples, not requirements.

**`xyz-bff`**
- `package.json` (`type: commonjs`, `dev` script is `tsx watch src/xyz.bff.ts`), `tsconfig.json`
  (references `uxp-common` and `uxp-bff-common`), `eslint.config.js`
- `src/env.ts`: loads `.env.dev` / `.env.prod` via `envLoader` and validates required keys
- `src/xyz.bff.ts`: Fastify with cookie + JWT plugins, `HandlerRegistry.discoverHandlers`,
  `registerRoutes`. Controllers live in `src/controllers/` and use `@Route(...)`.
- Routes are served under `/api`. They require login by default (`authenticate: true`).

Only add what the app uses. A BFF without a database should not import `HealthController`
from `uxp-bff-common`: it opens a TypeORM query runner. Add `@fastify/websocket` and
`registerLocalWebSocketHandlers` only when the app has WebSocket actions.

**`xyz-ui`**
- `package.json`, `tsconfig.json` (references `uxp-common`, `uxp-ui-lib`), `eslint.config.js`
- `index.html`: the standalone entry. It has the `window.uxp` stub used outside UXP, the
  `data-uxp-remove` library script tags, and the root element (see below).
- `src/config.ts`: reads the `data-*` attributes from the root element
- `src/index.tsx`: `initApplication(documentRoot)`; also calls it directly when
  `window.__UXP_PORTAL__` is not set (standalone mode)
- `src/app/store.ts`: Redux store that must include `remoteApp: remoteAppReducer`
- `src/XyzApp.tsx`: `UxpTheme`, `RemoteAppListener`, `BrowserRouter basename={basePath}`,
  `RemoteNavigationListener`

React, ReactDOM, Emotion and Axios are browser globals supplied by the platform. Do not bundle
them (the base webpack config marks them as externals).

Root element in `index.html`:

```html
<div id="root" data-base-route-path="/xyz" data-base-url="/xyz/"></div>
```

Add `data-ws-path="/xyz/ws-api"` when the app uses WebSockets, and `data-app-option='{...}'`
only if the app reads it (`getAppOption`). Unused attributes are just noise.

**`xyz-common`** (optional): shared request/response types and JSON schemas for
WebSocket actions and REST payloads, used by both BFF and UI. Create it when the first
shared type exists. Add `"@xyz/common": ["packages/xyz-common/dist", "packages/xyz-common/src"]`
to `paths` in the root `tsconfig.json`, and add it to the `watch` filter in the root
`package.json`.

After creating the packages run `pnpm install` from the repo root.

---

## 3. Webpack (UI)

Three configs, copied from `demo-ui`:

- `webpack.config.cjs`: the entry, output and `HtmlWebpackPlugin` (`publicPath: "/xyz/"`)
- `webpack.devserver.config.cjs`: dev server on the UI port, proxies, HMR path
- `webpack.production.config.cjs`: minified build, content-hashed file names

**The `META_TAG` and `output.library.name` must be identical.** UXP loads the script tagged
`data-uxp-remote-app="<META_TAG>"` and then calls `window[<META_TAG>].initApplication(shadowRoot)`.
If they differ the app never mounts and nothing is logged.

Dev server essentials:
- `webSocketURL: "auto://0.0.0.0:0/ws-xyz"` and `webSocketServer.options.path: "/ws-xyz"`
  (HMR; must be unique per app, see section 4)
- proxy `/xyz/api` to the BFF, rewriting `^/xyz/api` to `/api`
- proxy `/xyz/ws-api` to the BFF with `ws: true` (only when the app has WebSockets)
- proxy `/xyz/` to the dev server itself, rewriting `^/xyz/` to `/`
- serve `public/static/libs` at `/static/libs` (the development React/Emotion/Axios globals)

Optional extras seen in other apps, only needed when used: `health.html` / `system.html`
entries (UHN's `healthEntry` / `systemEntry`), an AJV alias, a `static/` folder.

---

## 4. Platform wiring

1. **Root `package.json`**: add `start:xyz-app` and `start:xyz-bff` scripts.
2. **`devserver.sh`**: add a tmux window that runs the two scripts.
3. **UXP UI dev server** (`packages/uxp-ui/webpack.devserver.config.cjs`): proxy
   `/ws-xyz` to the app's UI port with `ws: true`, so HMR works inside UXP.
4. **`nginx/nginx-dev-https.conf`**: add a `/ws-xyz` location, same as the others.
5. **`.env.template`**: document `REMOTE_HOST_XYZ=http://localhost:30N0`.
   Do **not** add it to the required keys in `uxp-bff/src/config/env.ts`; the dev config
   reads it with a default, and adding a required key breaks existing `.env.*` files.
6. **`CLAUDE.md`**: add the start commands and a row in the packages table.
7. **`packages/uxp-config-dev/src/uxp.dev.config.ts`**: add, using `defineConfig`:
   - `apps`: `{ name, baseUrl: REMOTE_HOST_XYZ, config: { contextPath: "/xyz", mainEntry: "index.html" } }`
   - `pages`: `{ identifier, name }`
   - `pageApps`: connects the page to the app, with `roles`
   - `routes`: `{ identifier, routePattern: "/route/*", link: "/route/", page, accessType: "role-based", roles }`
   - `routeTags`: put the route in `header-menu` to get a menu entry

In dev the UXP BFF applies this config on startup, but it loads the **built** package
(`packages/uxp-config-dev/dist`). `pnpm run watch` rebuilds it; otherwise run
`pnpm --filter @uxp/config-dev build` and restart the BFF, or run
`pnpm --filter @uxp/config-dev apply-config` against a running BFF
(see [Platform config](./platform-config.md#applying-config)).

`REMOTE_HOST_XYZ` is optional in `.env.dev`: the dev config falls back to
`http://localhost:30N0`. Set it only if the app runs on another host.

---

## 5. Production

Covered in [Deployment guide: Adding a New Remote App](./deployment-guide.md#adding-a-new-remote-app):
a BFF container, the UI build output in the web-remote image, nginx location blocks, and the
app registered with `baseUrl` and `contextPath`.

If the app's BFF runs on a different host from web-remote (for example `aud-bff` on a
Raspberry Pi next to the audio hardware), the registered `baseUrl` must point at a host that
serves both the static UI and the `/xyz/api` proxy. The exact setup for that case is not
documented yet; this section will be filled in when `aud` is deployed.

---

## 6. Verify

1. `pnpm install`, then build both packages (`pnpm build` in each) and lint from the root,
   for example `pnpm exec eslint "packages/xyz-*/src/**"`.
   (Per-package `pnpm lint` currently fails for the demo packages too.)
2. Start the BFF with the env loaded (`set -a; . ./.env.dev; set +a`) and check an
   unauthenticated request returns 401.
3. Check an authenticated request returns 200. Sign a token with `JWT_SECRET` and send it
   in the `accessToken` cookie.
4. Start the UI dev server and check `index.html` and the bundle are served.
5. Start the whole stack (`./devserver.sh start`), apply the config, log in and open the
   route. Check the app renders inside the Shadow DOM, that API calls go through
   `/api/content/resource/xyz/...`, and that HMR works.

---

## Pitfalls

- `META_TAG` differing from `library.name` leaves the app blank (section 3).
- MUI popovers, menus and dialogs must use the shadow-root portal container, otherwise they
  render outside the Shadow DOM and lose their styles. See `usePortalContainerRef()` in
  `uxp-ui-lib`.
- Controllers are discovered by scanning `src/controllers`; a controller must be an exported
  class with `@Route` methods, otherwise it is not registered.
- The HMR path (`/ws-xyz`) must be unique per app or dev servers steal each other's sockets.
