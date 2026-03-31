# Notification System & Platform Health

This document describes the **notification system** and **platform health monitoring** features in UXP. These are platform-level services — they monitor the UXP infrastructure itself, not remote apps.

---

## Overview

Two services work together:

- **Platform Health Service** — monitors platform infrastructure (e.g. TLS certificate expiry), stores health state in the database, broadcasts changes to the UI via WebSocket
- **Notification Service** — sends alerts (currently email) when health state changes (new issues, escalations, recoveries)

Both are configured through **Global Config** — a single-row database table edited via the admin Control Panel UI.

---

## Architecture

```
                           ┌──────────────────────────┐
                           │   GlobalConfigEntity      │
                           │   (single-row, id=1)      │
                           │                          │
                           │   notification.email.*   │
                           │   healthChecks.tlsCert.* │
                           └──────────┬───────────────┘
                                      │ reloadConfig()
                    ┌─────────────────┼─────────────────┐
                    ▼                                    ▼
          NotificationService                 PlatformHealthService
          (email channel)                     (check registry + cache)
                    ▲                                    │
                    │ notify()                           │ upsert()
                    └────────────────────────────────────┤
                                                         │ emit("healthChanged")
                                                         ▼
                                              UxpHealthDispatcher
                                                         │ broadcastHealthSnapshot()
                                                         ▼
                                            UxpServerWebSocketManager
                                              topic: "uxp:health/*"
                                                         │
                                                         ▼ WS
                                              UxpHealth (React)
                                                         │ dispatch()
                                                         ▼
                                              healthSlice (Redux)
                                                         │
                                              ┌──────────┴──────────┐
                                              ▼                     ▼
                                    HealthIndicatorButton    HealthNoticeBubble
                                    (header icon+badge)      (toast on change)
```

---

## Global Config

Global configuration is stored in a single database row (`GlobalConfigEntity`, id=1). It holds platform-wide settings that can be edited through the admin UI.

### Config structure

```typescript
type GlobalConfigData = {
    siteName: string;
    notification?: NotificationConfig;
    healthChecks?: HealthChecksConfig;
};
```

### Managed vs seeded fields

When config is applied from `defineConfig()` (e.g. production deploy), each field has a `managed` flag:

- `managed: true` — overwritten on every apply (platform enforces this value)
- `managed: false` — seeded only on first apply; subsequent applies preserve UI edits

This allows production to seed SMTP credentials once while letting admins adjust thresholds through the UI.

### Sensitive fields

SMTP passwords are encrypted at rest using AES-256-GCM (`ConfigCryptoService`). The encryption key is derived from the `UXP_ENCRYPTION_KEY` env var via HKDF-SHA256. The `GET /global-settings/full` endpoint masks the password as `********`.

### Schema validation

Each config field is validated individually by a custom AJV keyword (`ValidateGlobalConfigValue`). The UI patches one field at a time via `PATCH /global-settings` with `{ key, value }`. Valid keys are defined in `VALID_KEYS` in `global.schema.ts`.

---

## Notification Service

### Channels

The notification service manages a set of channels. Currently only **email** is implemented. Future channels (push, Slack) can be added by implementing the `NotificationChannel` interface.

### Email channel

Uses Nodemailer with configurable SMTP settings:

- **host, port, secure** — SMTP connection details (port auto-sets to 465/587 when secure is toggled)
- **user, password** — SMTP credentials (password encrypted in DB)
- **from** — sender address, defaults to `UXP Platform <noreply@{host}>`
- **recipients** — list of email addresses for health alerts

### REST API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /notifications/test-email` | Admin role | Send a test email to verify SMTP config |
| `POST /cli/notifications/send-email` | API key (`UXP_NOTIFICATION_API_KEY`) | Send an email (used by remote apps like uhn-master) |

The `send-email` endpoint accepts a `SendEmailBody` payload validated by `SendEmailSchema`. If `to` is omitted, sends to configured recipients.

---

## Platform Health Service

### Health checks

Health checks are registered in `PlatformHealthService.manageHealthChecks()`. Each check runs on a configurable interval and produces a result with `severity`, `message`, and optional `details`.

Currently implemented:

| Check | ID | Source | What it checks |
|-------|----|--------|----------------|
| TLS Certificate | `tls-cert` | `builtin:tls-cert` | Connects to the configured domain on port 443, reads cert expiry |

Valid health check IDs are defined in `UXP_HEALTH_IDS` — a single source of truth that derives the `UxpHealthId` type and the runtime enum for schema validation.

### TLS certificate check

Configurable via `healthChecks.tlsCert`:

- **enabled** — toggle check on/off
- **domain** — domain to check (falls back to `DOMAIN_NAME` env var)
- **warnDays** — days before expiry to trigger warning (default: 14)
- **errorDays** — days before expiry to trigger error (default: 7)
- **intervalHours** — check frequency (default: 6)

### Health state model

Each health item is stored in the `platform_health` table with:

- **key** — health check ID (e.g. `tls-cert`)
- **severity** — `ok`, `warn`, or `error`
- **message** — human-readable summary
- **details** — JSON object with check-specific data
- **source** — who produced it (e.g. `builtin:tls-cert`, `external`)
- **notifiedSeverity** — tracks the last severity that triggered a notification

The service maintains an in-memory cache (`Map<key, entity>`) synchronized with the database.

### Notification state machine

Notifications are sent only on meaningful state transitions:

| Previous state | New state | Action |
|----------------|-----------|--------|
| none / ok | warn or error | **New alert** |
| warn | error | **Escalation** |
| warn or error | ok | **Recovery** |
| ok | ok | No notification |
| same severity, same message | same | No notification |

The `notifiedSeverity` column prevents duplicate notifications across restarts.

### External health items

External tools (cronjobs, monitoring scripts) can push health items via the CLI API:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /cli/platform-health` | API key (`UXP_HEALTH_API_KEY`) | Get current health snapshot |
| `POST /cli/platform-health` | API key | Upsert a health item |
| `DELETE /cli/platform-health/:key` | API key | Remove a health item |

### Manual recheck

Admins can trigger a manual recheck from the UI:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /platform-health/recheck/:key` | Admin role | Re-run a health check (silent — no email) |

The `:key` parameter is validated against the `UXP_HEALTH_IDS` enum.

---

## WebSocket Health Broadcasting

### Server side

`PlatformHealthService` extends `EventEmitter`. On every `upsert()` or `remove()`, it emits `"healthChanged"` with the current `UxpHealthSnapshot`.

`UxpHealthDispatcher` listens to this event and calls `UxpServerWebSocketManager.broadcastHealthSnapshot()`, which sends to all clients subscribed to the `uxp:health/*` topic.

### Client side

`UxpHealth` (React component, renders null) manages the WebSocket lifecycle:

1. Registers `onMessage("uxp:health:snapshot")` handler
2. Subscribes to `health/*` pattern via `uxp:subscribe` action
3. On subscribe, the server sends the current snapshot immediately
4. Subsequent broadcasts arrive as the health state changes
5. Dispatches `healthSnapshotReceived` to Redux on each update
6. Cleanup on unmount removes all listeners

### Subscription protocol

```
Browser → Server:  { action: "uxp:subscribe",  payload: { patterns: ["health/*"] } }
Server → Browser:  { action: "uxp:subscribed", payload: { patterns: ["health/*"] } }
Server → Browser:  { action: "uxp:health:snapshot", payload: UxpHealthSnapshot }
```

---

## UI Components

### Header health indicator

`HeaderHealth` composes:

- **HealthIndicatorButton** — icon button in the header, shows severity icon (check/warning/error/unknown) with badge count of non-ok items
- **HealthMenu** — dropdown listing all apps and their health items, with recheck buttons for UXP items
- **HealthNoticeBubble** — toast notification on health state changes
- **HealthBootstraps** — bootstraps health reporting for remote apps
- **UxpHealth** — WebSocket subscriber (invisible)

### Health level derivation

`selectGlobalHealthLevel` returns:

- `"unknown"` — no snapshots, or all snapshots have empty items (checks not yet reported)
- `"ok"` — all items across all apps are ok
- `"warn"` — worst item is warn
- `"error"` — worst item is error

### Admin pages

The Control Panel includes:

- **Global Settings** — site name
- **Notifications** — email channel config (SMTP, recipients, test email)
- **Health Checks** — TLS cert check config (domain, thresholds, interval, manual recheck)

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `UXP_ENCRYPTION_KEY` | For encryption | AES-256-GCM key for SMTP password encryption |
| `UXP_HEALTH_API_KEY` | For CLI endpoints | Bearer token for external health check API |
| `UXP_NOTIFICATION_API_KEY` | For CLI endpoints | Bearer token for remote app email sending |
| `DOMAIN_NAME` | For TLS check | Fallback domain when not configured in global config |

---

## Adding a new health check

1. Add the check ID to `UXP_HEALTH_IDS` in `health.types.ts` — the type and schema enums update automatically
2. Create a check function in `services/health-checks/` returning `HealthCheckResult`
3. Register it in `PlatformHealthService.manageHealthChecks()` with its config and interval
4. Add the config type to `HealthChecksConfig` in `global.types.ts`
5. Add validation cases in `ValidateGlobalConfigValue` in `global.schema.ts`
6. Add the recheck branch in `PlatformHealthController.recheckHealth()` (currently hardcoded per check)
