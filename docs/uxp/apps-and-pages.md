# Apps and Pages

This document describes how remote apps and pages are modeled and composed in UXP.

- **Apps** define where remote functionality is hosted.
- **Pages** represent addressable UI views.
- **Page contents** define **what is rendered on a page** and in which order.

---

## Remote apps

Remote apps are configured in the database and exposed via the reverse proxy.

**Source**
- [AppEntity](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/AppEntity.ts)

Remote apps define:
- where the app is hosted (`baseUrl` – protocol, hostname, and port)
- whether the app is active
- runtime configuration used by the reverse proxy (`config`)

Remote apps are not rendered directly.
They are placed on pages via `PageAppsEntity`.

### App configuration

**Source**
- [AppConfigData](https://github.com/fisaks/uxp/blob/main/packages/uxp-common/src/uxp/pagesRoutesApps.types.ts)

App configuration defines runtime behavior for remote apps, including:
- remote app context paths
- WebSocket path overrides
- app options injected into the root mount element
- UI entry point configuration for React mounting

---

## Pages

Pages represent **addressable UI views** in UXP.

**Source**
- [PageEntity](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/PageEntity.ts)

Pages:
- are referenced by routes
- have a human-readable name
- define layout behavior via `PageConfigData`
- contain an ordered list of page contents (`PageAppsEntity`)

Pages do not define URLs themselves.
Addressability is handled entirely by routes.

### Page configuration

**Source**
- [PageConfigData](https://github.com/fisaks/uxp/blob/main/packages/uxp-common/src/uxp/pagesRoutesApps.types.ts)

Page configuration defines layout behavior, such as whether the page uses
full-width rendering or UXP-provided navigation.

---

## Page contents

Page contents define what is rendered **inside** a page.
Each entry represents a **single content placement** on a page.

**Source**
- [PageAppsEntity](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/PageAppsEntity.ts)

Each page content entry resolves to either:
- a remote app instance
- or an internal UXP component

Page content entries:
- are ordered using a floating-point `order` value
- may override remote app configuration on a per-placement basis
- are filtered by role-based visibility rules

Notes:
- `internalComponent` takes precedence over `app`
- each content placement has its own UUID (`contentUuid`)
- the UUID is used to resolve `/content/index/:uuid`
- this endpoint returns the reverse-proxied HTML for that content placement
- per-content configuration can override app-level configuration
  (for example, using a different `mainEntry`)