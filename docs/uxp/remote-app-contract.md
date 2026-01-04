# Remote App Contract

This document describes the **HTML and runtime contract** required for a remote app
to run inside UXP.

---

## Entry HTML

Remote apps must expose an HTML entry (usually `index.html`) that contains:
- a root mount element
- required `data-*` attributes

Remote apps are rendered by fetching their HTML entry via:

```
GET /content/index/:contentUuid
```

At runtime:
- the backend fetches the remote app HTML and rewrites it
- the frontend injects the HTML into a Shadow DOM
- the remote app is initialized inside that Shadow DOM

---

## Runtime expectations

A remote app must:

- read runtime configuration from root `data-*` attributes
- set `__webpack_public_path__` based on the resolved base URL
- mount its UI via `initApplication`
- return an optional cleanup function

Remote apps **should also be able to run standalone** (outside UXP) as long as they
follow the same initialization principles.

---

## Root element

Remote apps must define a root `<div>` element that contains
`data-base-url`.

Only `<div>` elements that already contain `data-base-url` are treated as
remote app roots.  
UXP **does not create** the root element.

---

## Backend HTML entry resolution

The backend resolves the remote app HTML entry **per content placement**.

Resolution inputs:
- `baseUrl` comes from `AppEntity`
- `contextPath` comes from merged app + content config
- `mainEntry` comes from merged app + content config

The target URL is built as:

```
baseUrl + contextPath + mainEntry
```

### Example

```
baseUrl     = http://localhost:3020
contextPath = /h2c
mainEntry   = index.html
```

Resolved target URL:

```
http://localhost:3020/h2c/index.html
```

Content-level overrides allow different entry points for the same app, for example:

```json
{ "mainEntry": "view.html" }
```

---

## Root element attributes

The following attributes are used by UXP and the remote app.

### Automatically rewritten or added by UXP (backend)

- **`data-base-url`**  
  Rewritten to the proxied resource base URL used for assets and API calls.

- **`data-ws-path`**  
  Rewritten to the proxied WebSocket path.

- **`data-uxp-content-id`**  
  Automatically added. Identifies the content placement.

- **`data-uxp-app-identifier`**  
  Automatically added. Identifies the remote app.

- **`data-app-option`**  
  Automatically **overwritten** if defined in UXP configuration.  
  If not defined in UXP, the existing value from the app HTML is preserved.

---

### Automatically added by UXP (frontend)

- **`data-base-route-path`**  
  Added in the browser when the HTML is injected.  
  Represents the **React Router base path** under which the remote app is mounted
  inside UXP.

---

## Root element attribute rewrite rules

When serving `/content/index/:contentUuid`, the backend rewrites attributes
on the remote app root element.

Only `<div>` elements that already contain `data-base-url` are processed.

---

### Rewrite rules

**`data-base-url*` attributes**

- Any attribute starting with `data-base-url` is rewritten
- The value is converted to a proxied resource URL

**`data-ws-path*` attributes**

- Any attribute starting with `data-ws-path` is rewritten
- The value is replaced with the proxied WebSocket path

All other attributes are left untouched unless explicitly listed above.

---

### Example

**Remote app HTML (original output):**

```html
<div id="root"
  data-base-url="/uhn"
  data-ws-path="/uhn/ws-api"
  data-app-option='{"main":"UHNApp"}'>
</div>
```

**UXP rewritten HTML (returned to the browser):**

```html
<div id="root"
  data-base-url="/api/content/resource/uhn"
  data-ws-path="/ws-api/uhn"
  data-uxp-content-id="7bf66180-faca-4a91-9c12-0fd7e5cfa5e9"
  data-uxp-app-identifier="uhn"
  data-app-option='{"main":"UHNApp"}'>
</div>
```

**Frontend-injected attribute:**

```html
<div id="root"
  data-base-route-path="/unified-home-network/">
</div>
```

Notes:
- `data-base-url` is rewritten using the reverse proxy resource path
- `data-ws-path` is rewritten to the proxied WebSocket endpoint
- `data-uxp-content-id` and `data-uxp-app-identifier` are always added
- `data-app-option` is preserved unless overridden by UXP configuration
- `data-base-route-path` is injected in the browser, not by the backend

---

## Routing responsibility inside the remote app

The remote app **must treat `data-base-route-path` as its routing base**.

This value represents the React Router base path under which the remote app
is mounted inside UXP.

The remote app should:
- configure its router to use this value as the base path
- avoid assuming it is mounted at `/`

Without respecting `data-base-route-path`, client-side routing inside UXP
will not function correctly.

---


## `__webpack_public_path__`

The remote app must set `__webpack_public_path__` at runtime based on
the resolved `data-base-url`, before loading any code-split chunks.

---

### Running a remote app outside UXP

A UXP remote app should also be able to run **standalone**, without UXP.

This is achieved by adhering to the same contract used when the app is
rendered inside UXP.

A remote app must:

- initialize itself via `initApplication(container)`
- read runtime configuration from `data-*` attributes on the root element
- derive all URLs (assets, APIs, WebSockets, routing base paths) from:
  - `data-base-url`
  - `data-base-route-path`
  - `data-ws-path`
  - `data-app-option`

When running outside UXP:

- the app provides the same root element and `data-*` attributes directly
  in its own `index.html`
- the app may initialize itself by calling `initApplication(document)`
  from its main entry point

UXP does not introduce special APIs for remote apps.
It only supplies values for the same `data-*` attributes that a remote app
can define and use on its own.

---

## Why this contract exists

This contract allows:
- the same remote app to run standalone or inside UXP
- multiple instances of the same app to coexist
- per-placement configuration and routing isolation
- runtime composition without rebuilds