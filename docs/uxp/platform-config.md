# Platform Configuration

This document describes how UXP platform configuration (apps, pages, routes, tags, global settings) is authored, validated, and applied.

---

## Overview

Platform configuration is defined as **TypeScript code** using a type-safe `defineConfig()` function. Configuration is validated at compile time — cross-reference errors (e.g. a route referencing a non-existent page) are caught by `pnpm typecheck`.

Configuration is applied to the database at runtime, either automatically on BFF startup (dev) or via a CLI tool / HTTP endpoint.

---

## Packages

| Package | Location | Purpose |
|---------|----------|---------|
| `@uxp/config` | `uxp/packages/uxp-config` | Types, `defineConfig()`, `basePlatformConfig`, `globalConfig()`, CLI tool |
| `@uxp/config-dev` | `uxp/packages/uxp-config-dev` | Dev environment configuration (all apps: H2C, demo, UHN) |
| `@uxp/config-prod` | `uxp-server/uxp-config-prod` | Production configuration (UHN only) |

The prod config lives in the `uxp-server` repo alongside deployment infrastructure, not in the uxp monorepo. It depends on `@uxp/config` via `link:` to the uxp repo.

---

## Base platform config

`basePlatformConfig` in `@uxp/config` defines the core UXP platform entities that are shared across all environments:

- **Tags:** `header-menu`, `profile-icon`
- **Pages:** login, register, register-thank-you, my-profile, my-settings, start-page, control-panel
- **Page contents:** internal component bindings for the above pages
- **Routes:** login, register, profile, settings, start-page (`/start`), control-panel, default redirects
- **Route tags:** auth-root → header-menu, profile routes → profile-icon, control-panel → profile-icon

The `auth-root` route (`/`) is **not** in the base config — each environment defines where `/` points. Dev uses `start-page`, prod uses `unified-home-network`.

---

## Environment config

Each environment config spreads `basePlatformConfig` and adds its own apps, pages, routes, and tags using plain inline objects:

```typescript
import { defineConfig, basePlatformConfig, globalConfig } from "@uxp/config";

export default defineConfig({
    tags: [...basePlatformConfig.tags, { name: "demo-links" }],
    apps: [{ name: "H2C", baseUrl: "...", config: { contextPath: "/h2c", mainEntry: "index.html" } }],
    pages: [...basePlatformConfig.pages, { identifier: "home-2-care", name: "Home 2 Care" }],
    // ...
    routes: [
        ...basePlatformConfig.routes,
        { identifier: "auth-root", routePattern: "/", link: "/", page: "start-page", accessType: "authenticated" },
        // ...
    ],
    // ...
    globalConfig: globalConfig({
        siteName: { value: "UXP Dev", managed: true },
    }),
});
```

`defineConfig()` uses `const` generic parameters to infer literal types from the inline objects. This means cross-references are validated at compile time — a typo like `page: "logn"` produces a compile error, and IDE autocomplete suggests valid page/route/tag identifiers.

---

## Global config

Global configuration uses per-field `managed` flags:

```typescript
globalConfig({
    siteName: { value: "Solbacka", managed: true },

    "notification.email.enabled": { value: true, managed: false },
    "notification.email.smtp.host": { value: "some.smtp.com", managed: false },
    // ... other notification and health check fields

    "healthChecks.tlsCert.enabled": { value: true, managed: false },
    "healthChecks.tlsCert.intervalHours": { value: 12, managed: false },
})
```

- `managed: true` — value is overwritten on every apply
- `managed: false` — value is only seeded if no global config row exists; subsequent applies preserve UI edits

Global config supports nested dotted keys for notification and health check settings. Sensitive values (e.g. SMTP password) are encrypted at rest. See [Notification and platform health](./notification-and-health.md) for the full config structure.

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
        "prod": { "url": "https://solbacka.ddns.net", "key": "<api-key>" }
    }
}
```

### Dev config

```bash
pnpm --filter @uxp/config-dev apply-config
```

### Prod config

```bash
cd uxp-server/uxp-config-prod
pnpm apply-config
```

The prod `apply-config` script builds the config and runs `uxp-config apply --config $PWD/dist/index.js --profile prod`. The `--config` flag uses an absolute path because the config package is outside the uxp monorepo and can't be resolved by name.

### HTTP endpoint

```
POST /api/cli/apply-config
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
