# Resource Proxying

This document describes how UXP rewrites and proxies **HTML entries, assets,
API requests, and WebSocket connections** for remote apps.

---

## Overview

Remote apps are never accessed directly by the browser.

Instead, all resources are fetched through UXP, which:
- resolves the correct upstream app
- rewrites resource URLs
- forwards requests via a reverse proxy

This ensures consistent routing, isolation, and per-placement configuration.

---

## HTML entry rewriting

Remote app HTML is fetched via:

```
GET /content/index/:contentUuid
```

Before returning the HTML to the browser, UXP rewrites resource references
so that **all relative assets load through the proxy**.

### What is rewritten

In the fetched HTML entry, UXP processes:

- `<script src="...">`
- `<link href="...">`

#### Rewrite rules

- **Absolute URLs** (`http://`, `https://`, `//`)  
  → left unchanged

- **Relative URLs**  
  → rewritten to:

```
/api/content/resource/:appIdentifier/<path-without-contextPath>
```

This ensures assets are fetched through UXP instead of directly from the app.

### `data-uxp-remove` (HTML entry only)

UXP removes elements marked with:

```html
data-uxp-remove="true"
```

This applies to:
- inline `<script>`
- external `<script src>`
- `<link>` elements

This mechanism allows remote apps to include **local-only scripts or shims**
for standalone development, which are automatically stripped when running
inside UXP.

### Example

```html
<script src="/local/react.dev.js" data-uxp-remove="true"></script>
<script data-uxp-remove="true">
  window.uxp = { /* local runtime shim */ };
</script>
```

---

## Resource proxy endpoint

All assets and HTTP requests are forwarded through:

```
/api/content/resource/:appIdentifier/*
```

### Proxy behavior

For each request:
1. The app is resolved using `appIdentifier`
2. The upstream URL is built as:

```
baseUrl + contextPath + resourcePath (+ querystring)
```

3. The request method, headers, and body are forwarded
4. The upstream response is streamed back to the browser

This endpoint supports:
- static assets
- API calls
- file downloads
- Multipart file uploads
- arbitrary HTTP methods

### Resource Proxy Request Flow (Remote Apps)

Request flow:
```
Browser
  ↓
/api/content/resource/:appIdentifier/*
  ↓
UXP RemoteController
  ↓
baseUrl + contextPath + resourcePath
  ↓
RemoteApp  
```

All HTTP requests from remote apps are sent through:

```
/api/content/resource/:appIdentifier/*
```

Remote apps must **never call backend services directly**.
All URLs are built relative to the proxied base URL provided by UXP.

#### Backend request handling

The proxy endpoint performs the following steps:

1. Extract `appIdentifier` from the URL
2. Resolve the app via `AppEntity.identifier`
3. Strip the proxy prefix to obtain the resource path
4. Build the upstream URL:

```
baseUrl + contextPath + resourcePath (+ query string)
```

5. Forward the request method, headers, and body
6. Stream the upstream response back to the browser

This behavior is implemented in `RemoteController.executeContentResource`.


#### Building API URLs in remote apps

Remote apps derive their API base URL from the root element:

```ts
initializeConfig(rootElement);
```

The value of `data-base-url` is rewritten by UXP to point at the proxy endpoint.

All API calls should be built relative to this base.

Remote apps must read and store `data-base-url` during `initApplication`.

This value represents the **proxied base URL** provided by UXP and must be
cached in application runtime state so it can be reused later when building
API, asset, and upload URLs.

Example:

```ts
const baseUrl = rootElement.getAttribute("data-base-url");
```

All subsequent HTTP requests should be constructed relative to this stored
base URL (for example via getBaseUrl()), ensuring they are routed through
UXP’s resource proxy instead of calling backend services directly.

```ts
await axios.get(`${getBaseUrl()}/api/houses`);
```

At runtime this resolves to:

```
/api/content/resource/<appIdentifier>/api/houses
```

UXP then forwards the request to the correct backend service.

---

## WebSocket proxying

WebSocket proxying in UXP involves authentication, session tracking,
connection recovery, and bidirectional message forwarding.

Because of this complexity, it is documented separately:

➡️ **[WebSocket proxying](./websocket-proxying.md)**

---

## Shared browser globals (bundle size optimization)

UXP currently provides some shared libraries as browser globals to reduce
remote app bundle size.

Remote apps should mark these as webpack externals:

```js
externals: {
  react: "React",
  "react-dom": "ReactDOM",
  "@emotion/react": "emotionReact",
  "@emotion/styled": "emotionStyled",
  axios: "axios",
}
```

### Local development

During standalone development, these libraries can be included directly
in `index.html` using `data-uxp-remove="true"`.

UXP strips them automatically when running inside the platform.

Reference loader script:
https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/download-scripts.sh

### Future direction

These libraries are provided as browser globals today.
The long-term goal is to move toward ES module–based loading once
tooling, HMR, and runtime support are mature enough.

---

## Why this exists

Resource proxying allows UXP to:
- isolate remote apps
- apply per-placement configuration
- avoid CORS issues
- support multiple app instances
- evolve runtime behavior without rebuilding apps