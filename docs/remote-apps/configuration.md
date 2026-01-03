# Configuration notes

Short internal notes. Follow the code for details.

---

## Remote apps

Remote apps are configured in the database and exposed via the reverse proxy.

### Backend (source of truth)

- **App entity**
  `packages/uxp-bff/src/db/entities/AppEntity.ts`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/AppEntity.ts

Defines:
- remote app host (`baseUrl`)
- whether the app is enabled
- runtime config passed to the reverse proxy (`config`)

### Shared config / types

- **AppConfigData**
  `packages/uxp-common/src/uxp/pagesRoutesApps.types.ts`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-common/src/uxp/pagesRoutesApps.types.ts

Defines:
- remote app runtime paths (e.g. `contextPath`)
- websocket path overrides
- app options injected into the root mount element
- UI entry point configuration for React mounting
---

## UI entry point (React mount)

Remote apps are expected to expose a root HTML entry (usually `index.html`)
with a mount element used by the app’s React bootstrap code.

UXP:
- fetches the entry HTML from the remote app
- rewrites asset URLs
- injects config via `data-*` attributes on the root mount element

The actual React mounting logic remains fully owned by the remote app.

---
