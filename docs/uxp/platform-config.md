# Platform Configuration

This document describes how UXP platform configuration (apps, pages, routes, tags, global settings) is authored, validated, and applied.

---

## Overview

Platform configuration is defined as **TypeScript code** using a type-safe factory system. Configuration is validated at compile time — cross-reference errors (e.g. a route referencing a non-existent page) are caught by `pnpm typecheck`.

Configuration is applied to the database at runtime, either automatically on BFF startup (dev) or via a CLI tool / HTTP endpoint.

---

## Packages

| Package | Purpose |
|---------|---------|
| `@uxp/config` | Types, `defineConfig()` factory, `basePlatformConfig`, factory functions, CLI tool |
| `@uxp/config-dev` | Dev environment configuration |


---

## Base platform config

`basePlatformConfig` in `@uxp/config` defines the core UXP platform entities that are shared across all environments:

- **Tags:** `header-menu`, `profile-icon`
- **Pages:** login, register, register-thank-you, my-profile, my-settings, start-page, control-panel
- **Page contents:** internal component bindings for the above pages
- **Routes:** login, register, profile, settings, start-page (`/start`), control-panel, default redirects
- **Route tags:** auth-root → header-menu, profile routes → profile-icon, control-panel → profile-icon

The `auth-root` route (`/`) is **not** in the base config — each environment defines where `/` points. Dev uses `start-page`

---

## Environment config

Each environment config spreads `basePlatformConfig` and adds its own apps, pages, routes, and tags:

```typescript
import { defineConfig, basePlatformConfig, tag, app, page, pageApp, route, routeTag } from "@uxp/config";

export default defineConfig({
    tags: [...basePlatformConfig.tags, tag({ name: "demo-links" })],
    apps: [app({ name: "H2C", baseUrl: "...", config: { ... } })],
    pages: [...basePlatformConfig.pages, page({ identifier: "home-2-care", name: "Home 2 Care" })],
    // ...
    routes: [
        ...basePlatformConfig.routes,
        route({ identifier: "auth-root", routePattern: "/", link: "/", page: "start-page", accessType: "authenticated" }),
        // ...
    ],
    // ...
});
```

A typo like `page: "logn"` produces a compile error.

---

## Factory functions

Factory functions (`tag`, `app`, `page`, `pageApp`, `route`, `routeTag`, `globalConfig`) preserve TypeScript literal types through spreads into `defineConfig()`. They use `const` generic parameters so that cross-references between entities are validated at the type level.

---

## Global config

Global configuration uses per-field `managed` flags:

```typescript
globalConfig({
    siteName: { value: "UXP Dev", managed: true },
})
```

- `managed: true` — value is overwritten on every apply
- `managed: false` — value is only seeded if no global config row exists; subsequent applies preserve UI edits

---

## Applying config

### Dev: automatic on startup

The BFF applies the dev config automatically on startup in non-production mode. See `uxp.dev.ts`.

### CLI tool

```
uxp-config apply [--profile name] [--key key] [--url url] [--config pkg]
```

Reads connection details from `~/.uxp/config.json`:

```json
{
    "defaultProfile": "dev",
    "profiles": {
        "dev": { "url": "http://localhost:3001", "key": "<api-key>" },
        "prod": { "url": "https://prod:3001", "key": "<api-key>" }
    }
}
```

Or via `pnpm --filter @uxp/config-dev apply-config`.

### HTTP endpoint

```
POST /api/system/apply-config
Authorization: Bearer <UXP_CONFIG_API_KEY>
Content-Type: application/json
```

Body is the serialized config JSON. Protected by API key (`UXP_CONFIG_API_KEY` env var).

---

## Apply behavior

The apply service:

1. Validates cross-references and requires a root route (`/`)
2. Deletes all managed tables in FK order (children first)
3. Batch inserts in FK order (parents first)
4. Uses deterministic UUID v5 for page content placements (stable across re-applies)
5. Handles global config with per-field managed/seed logic

The entire operation runs in a single database transaction.

---

## Deterministic UUIDs

Page content placements (`PageAppsEntity`) use UUID v5 derived from `page + app/component + order`. The same config input always produces the same UUIDs, keeping them stable across re-deploys.
