# UXP Configuration Overview

Short internal documentation for core UXP concepts.
This file intentionally stays **high-level** and links to code for details.

---

## Remote apps

Remote apps are configured in the database and exposed via the reverse proxy.
They are embedded into pages and rendered inside the UXP UI.

### Backend (source of truth)

- **AppEntity**
  `packages/uxp-bff/src/db/entities/AppEntity.ts`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/AppEntity.ts

Defines:
- remote app host (`baseUrl` – protocol, hostname, port)
- whether the app is active
- runtime configuration passed to the reverse proxy (`config`)

Apps are not rendered directly.
They are placed on pages via `PageAppsEntity`.

### Shared config / types

- **AppConfigData**
  `packages/uxp-common/src/uxp/pagesRoutesApps.types.ts`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-common/src/uxp/pagesRoutesApps.types.ts

Defines shared runtime configuration for remote apps, including:
- remote app context paths
- websocket path overrides
- app options injected into the root mount element
- UI entry point configuration for React mounting

---

## Pages and page contents

Pages define **addressable UI pages** in UXP.
Page contents define **what is rendered on the page** and in which order.

---

### PageEntity

- **Source**
  `packages/uxp-bff/src/db/entities/PageEntity.ts`  
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/PageEntity.ts

Represents a single page rendered by UXP.

A page:
- is referenced by routes
- page name
- page-level UI configuration (`PageConfigData`)
- ordered list of page contents (`PageAppsEntity`)

Page configuration:
- `pageType`
  - `fullWidth` – no left navigation
  - `leftNavigation` – page uses UXP left navigation
- `routeLinkGroup`
  - used to select which routes appear in the left navigation

Pages do not define URLs themselves.

---

### PageAppsEntity (page contents)

- **Source**
  `packages/uxp-bff/src/db/entities/PageAppsEntity.ts`  
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/PageAppsEntity.ts

Represents a **single content placement on a page**.

A page can contain multiple ordered content entries.

Each entry represents either:
- a remote app instance
- or an internal UXP component

Page content entries:
- are ordered using a floating-point value
- have per-content configuration overrides
- are filtered by role-based visibility

Notes:
- `internalComponent` takes precedence over `app`
- each content placement has its own UUID (`contentUuid`)
- the UUID is used to resolve `/content/index/:uuid`
- per-content config can override app config (e.g. different `mainEntry`)

## Routing and navigation

Routing and navigation are intentionally separated from pages and content.

---

### Routes

Routes define **which URLs exist** in UXP and **which page is rendered**.

- **Source**
  `RouteEntity`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/RouteEntity.ts

Routes:
- match URL patterns
- control visibility based on authentication and roles
- reference a page to render
- participate in navigation via tags

Routes do not define layout or content.

Wildcard routes are commonly used to host:
- remote apps
- internal components with their own nested routing

The derived base route path is passed down to rendered content,
which is expected to treat it as its routing base.

---

### Navigation tags

Tags define **navigation structure**, not routing behavior.

- **Source**
  `TagEntity`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/TagEntity.ts

Tags:
- group routes into named navigation sets
- are used to build menus and navigation UIs
- do not affect routing or access rules

---

### Route–tag associations

Routes are associated with tags via a join entity.

- **Source**
  `RouteTagsEntity`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/RouteTagsEntity.ts

These associations:
- bind routes to navigation tags
- optionally define ordering within a tag

---

### Navigation resolution

Navigation data is resolved server-side.

At a high level:
- routes and tags are loaded
- access rules are applied
- invisible routes are removed
- empty tags are omitted

The client receives only:
- tag names
- ordered route identifiers

Implementation reference:
- `NavigationService`
  https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/services/navigation.service.ts

---

## Conceptual separation

UXP intentionally separates responsibilities:

- **Apps** define remote capabilities
- **Pages** define layout and composition
- **Page contents** define what is placed on a page
- **Routes** define addressability and visibility
- **Tags** define navigation structure

This separation keeps the system flexible, composable,
and easier to reason about when changes are needed.

## Remote app HTML contract

Remote apps are rendered by fetching their HTML entry via:

GET /content/index/:contentUuid

The backend fetches the remote app HTML, rewrites it, and returns HTML.
The frontend injects the HTML into a Shadow DOM and initializes the app.

---

### Root element

Remote apps must define a root `<div>` in their HTML that contains
`data-base-url`.

Only `<div>` elements with `data-base-url` are treated as the app root.
UXP does not create the root element.

---

### Backend HTML entry resolution

The backend resolves the remote app HTML entry **per content placement**.

Resolution logic:
- `baseUrl` comes from `AppEntity`
- `contextPath` comes from merged app + content config
- `mainEntry` comes from merged app + content config

The target URL is built as:

```
baseUrl + contextPath + mainEntry
```

Example:

```
baseUrl     = http://localhost:3020
contextPath = /h2c
mainEntry   = index.html
```

Resolved target URL:

```
http://localhost:3020/h2c/index.html
```

Content-level overrides allow different entry points for the same app, e.g.:

```json
{ "mainEntry": "view.html" }
```

---

### Root element attributes

The following attributes are used by UXP and the remote app.

#### Automatically rewritten or added by UXP (backend)

- `data-base-url`  
  Rewritten to the proxied asset / API base URL

- `data-ws-path`  
  Rewritten to the proxied WebSocket path

- `data-uxp-content-id`  
  Automatically added. Identifies the content placement.

- `data-uxp-app-identifier`  
  Automatically added. Identifies the remote app.

- `data-app-option`  
  Automatically **overwritten** if defined in UXP configuration.  
  If not defined in UXP, the existing value from the app HTML is preserved.

---

#### Automatically added by UXP (frontend)

- `data-base-route-path`  
  Automatically added in the browser.  
  Represents the current UXP navigation base path.

---

### Root element attribute rewrite rules

When serving `/content/index/:contentUuid`, the backend rewrites attributes
on the remote app root element.

Only `<div>` elements that already contain `data-base-url` are processed.

---

#### Rewrite rules

**`data-base-url*` attributes**

- Any attribute starting with `data-base-url` is rewritten
- The value is converted to a proxied resource URL

**`data-ws-path*` attributes**

- Any attribute starting with `data-ws-path` is rewritten
- The value is replaced with the proxied WebSocket path

Other attributes are left untouched unless explicitly listed above.

---

#### Example

**Remote app HTML (original output):**

```html
<div id="root"
  data-base-route-path="/uhn"
  data-base-url="/uhn"
  data-ws-path="/uhn/ws-api"
  data-app-option='{"main":"UHNApp"}'
>
```

**UXP rewritten HTML (returned to browser):**

```html
<div id="root" 
    data-base-route-path="/uhn" 
    data-base-url="/api/content/resource/uhn" 
    data-ws-path="/ws-api/uhn" data-uxp-content-id="7bf66180-faca-4a91-9c12-0fd7e5cfa5e9" data-uxp-app-identifier="uhn"
    data-app-option='{"main":"UHNApp"}'
>

```

Notes:
- `data-base-url` is rewritten using the reverse proxy resource path
- `data-ws-path` is rewritten to the proxied WebSocket endpoint
- `data-uxp-content-id` and `data-uxp-app-identifier` are always added
- `data-app-option` is preserved unless overridden by UXP config
- `data-base-route-path` is not touched by backend will be rewritten in browser

data-base-route-path can and should be defined in the remote app and include the value in it router oterhwise routes can not function inside uxp 
---

### Application initialization

After HTML injection and script loading, UXP calls:

`window[appIdentifier].initApplication(container)`

The remote app must:
- read runtime configuration from root `data-*` attributes
- set `__webpack_public_path__` to the proxied asset base URL provided by UXP
- mount the UI
- return an optional cleanup function

### `__webpack_public_path__`

The remote app must set `__webpack_public_path__` **at runtime**, before any
code-split chunks are loaded.

The value **must be derived from `data-base-url`** on the root element and
normalized to end with a trailing slash.

This path represents:
- the reverse-proxied base URL used by UXP to serve remote app assets
- the location from which Webpack loads lazy-loaded chunks and runtime files

Example root element provided by UXP:

```html
<div
  id="root"
  data-base-url="/api/content/resource/uhn/"
></div>
```

Runtime initialization:
```ts
__webpack_public_path__ = baseUrl.endsWith("/")
  ? baseUrl
  : baseUrl + "/";
```

Without setting `__webpack_public_path__`, Webpack will attempt to load
chunks from an incorrect location (such as / or the build-time
publicPath), causing lazy-loaded modules to fail at runtime.

### Examples: how `window[appIdentifier]` is created

The remote app is responsible for exposing itself on `window`.
UXP only discovers and calls it.

---

#### Webpack configuration (remote app)

The remote app bundle is built as a global library:

```js
output: {
    library: {
        name: "uhn",
        type: "window",
    },
}
```

This causes Webpack to emit the bundle as:

```ts
window["uhn"] = exports;
```

The exported object must include `initApplication`.

---

#### Injecting the identifier into HTML

The same identifier is injected into the generated HTML as a script attribute:

```js
new htmlWebpackInjectAttributesPlugin({
    "data-uxp-remote-app": "uhn",
})
```

Resulting HTML output:

```html
<script
  src="/uhn/uhn-ui.bundle.js"
  data-uxp-remote-app="uhn"
></script>
```

---

#### Runtime resolution in UXP UI

During HTML injection, UXP reads the attribute:

```ts
const remoteApp = scriptElement.dataset.uxpRemoteApp;
```

And later initializes the app using:

```ts
window[remoteApp].initApplication(container);
```

UXP does not create or modify `window[remoteApp]`.

---

#### Required identifier consistency

The same identifier must be used consistently in all places:

| Location | Example value |
|--------|---------------|
| `AppEntity.identifier` | `uhn` |
| Webpack `output.library.name` | `uhn` |
| Script `data-uxp-remote-app` | `uhn` |
| Global object | `window["uhn"]` |

If any of these differ, the remote app cannot be initialized.

---

#### Minimal remote app export example

```ts
export const initApplication = (container) => {
    // mount UI
    return () => {
        // cleanup on unmount
    };
};
```

This function must be reachable as:

```ts
window["uhn"].initApplication
```

### Example: `initApplication` implementation

A minimal real-world example can be found here:

https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/demo-ui/src/index.tsx#L4

This example demonstrates a typical `initApplication` implementation used by
remote apps rendered inside UXP.

Key characteristics:

- `initApplication` is exported and exposed via the Webpack global
- It receives a `ShadowRoot` or `Document` as its container
- It mounts the application into an existing root element
- It returns an optional cleanup function for unmounting

At runtime, UXP calls:

`window[appIdentifier].initApplication(container)`


The implementation details (React, state management, styling, etc.)
are fully owned by the remote app.

### Running a remote app outside UXP

A UXP remote app should also be able to run **standalone**, without UXP.

This is achieved by following these rules:

- The app is initialized via `initApplication(container)`
- Runtime configuration is read from `data-*` attributes on the root element
- URLs (assets, APIs, WebSockets, routing base paths) are derived from:
  - `data-base-url`
  - `data-base-route-path`
  - `data-ws-path`
  - `data-app-option`

When running outside UXP:
- the same root element and `data-*` attributes are provided directly by the app’s own `index.html`
- `initApplication(document)` can be called directly from the bundles main entry point

```ts
if (!window.__UXP_PORTAL__) {
    initApplication(document);
}
```

UXP does not introduce special APIs for remote apps.
It only supplies values for the same `data-*` attributes that the app can define itself.

## Resource rewriting & proxying

UXP rewrites the remote app HTML entry (from `/content/index/:contentUuid`) so
all referenced resources load through the reverse proxy.

### What is rewritten in HTML

In the fetched HTML entry, UXP processes:

- `<script src="...">`
- `<link href="...">`

Rules:
- If the URL is absolute (`http...` or `//...`) → it is left as-is
- Otherwise it is rewritten to:

`/api/content/resource/:appIdentifier/<path-without-contextPath>`

This makes relative assets load via the resource proxy endpoint.

### Resource proxy endpoint

All assets (and other HTTP requests) are forwarded through:

`/api/content/resource/:appIdentifier/*`

This endpoint:
- looks up the app by `appIdentifier` (`AppEntity.identifier`)
- builds the upstream URL as:

`baseUrl + contextPath + resourcePath (+ querystring)`

- forwards the request method/headers/body
- streams the upstream response back to the browser

### `data-uxp-remove` (HTML entry only)

UXP removes resources marked with `data-uxp-remove="true"` from the HTML entry:

- inline scripts: removed if `data-uxp-remove="true"`
- external scripts: removed if `data-uxp-remove="true"`
- links: removed if `data-uxp-remove="true"`

This is used to support standalone/local runtime without UXP:
the app can include local-only scripts/shims in `index.html`, and they will be
automatically removed when running inside UXP.

Example (local-only scripts/shims):

```html
<script src="/uhn/static/libs/development/react.development.js" data-uxp-remove="true"></script>
<script data-uxp-remove="true">
  window.uxp = { /* local runtime shim */ };
</script>
```

### Shared browser globals (bundle size optimization)

UXP currently provides some shared libraries as browser globals to keep remote
app bundles smaller.

Remote apps should mark these as webpack externals:

```js
externals: {
  react: "React",
  "react-dom": "ReactDOM",
  "@emotion/react": "emotionReact",
  "@emotion/styled": "emotionStyled",
  axios: "axios",
},
```

Local development can include these via `index.html` using `data-uxp-remove="true"`,
while UXP runtime provides them globally.

Reference script loader:
https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/download-scripts.sh

Future note: these are browser globals today; the long-term goal is to move
towards ES modules when tooling/runtime is mature enough. 

## RemoteApp Shadow DOM injection (browser)

Remote apps are rendered inside a host `<div>` created by the UXP UI:

```html
<div id="remote-app-<contentUuid>"></div>
```

This host element lives in the normal (light) DOM and acts as the **ShadowRoot host**.
All remote app UI is rendered via a ShadowRoot attached to this element.

Source:
`packages/uxp-ui/src/features/remote-app/RemoteApp.tsx`
https://github.com/fisaks/uxp/blob/main/packages/uxp-ui/src/features/remote-app/RemoteApp.tsx

---

### ShadowRoot creation

When the remote app is loaded:

- a ShadowRoot is attached to the host div (or reused if it already exists)
- the ShadowRoot is fully cleared before injecting new content

The remote app never renders directly into the light DOM.

---

### What is rendered as Shadow DOM content

From the fetched HTML entry (`/content/index/:contentUuid`), UXP:

- clones all non-script nodes from `<head>` into the ShadowRoot  
  (e.g. `<style>`, `<link>`, `<meta>`)
- clones all non-script nodes from `<body>` into the ShadowRoot  
  (including the remote app root `<div data-uxp-app-identifier=...>`)

These nodes are real Shadow DOM nodes and are scoped by the ShadowRoot.

Special case:
- if the cloned node is the remote app root div,
  UXP adds:
  - `data-base-route-path="<react-router-base-path-for-remote-app>"`
  before application initialization

This value represents the React Router base path under which the remote app
is mounted inside UXP.

Remote apps must treat this value as the routing base path and configure
their internal routing accordingly (e.g. React Router basename).

---

### Script handling (important nuance)

`<script>` elements are **not cloned** as-is.

Instead:
- new `<script>` elements are created using `document.createElement("script")`
- all attributes and content are copied
- the scripts are appended under the ShadowRoot

Scripts therefore appear under the ShadowRoot in the DOM tree, **but they execute
in the global document context** (shared `window`). This is intentional: browsers
do not scope JavaScript execution to Shadow DOM; Shadow DOM scopes DOM structure
and styles, not JS execution.

---

### Remote app bundle script (loaded once)

Scripts with both:
- `src="..."`
### What is rewritten in HTML

In the fetched HTML entry, UXP processes:

- `<script src="...">`
- `<link href="...">`

Rules:
- If the URL is absolute (`http...` or `//...`) → it is left as-is
- Otherwise it is rewritten to:

`/api/content/resource/:appIdentifier/<path-without-contextPath>`

This makes relative assets load via the resource proxy endpoint.

### Resource proxy endpoint

All assets (and other HTTP requests) are forwarded through:

`/api/content/resource/:appIdentifier/*`

This endpoint:
- looks up the app by `appIdentifier` (`AppEntity.identifier`)
- builds the upstream URL as:

`baseUrl + contextPath + resourcePath (+ querystring)`

- forwards the request method/headers/body
- streams the upstream response back to the browser

### `data-uxp-remove` (HTML entry only)

UXP removes resources marked with `data-uxp-remove="true"` from the HTML entry:

- inline scripts: removed if `data-uxp-remove="true"`
- external scripts: removed if `data-uxp-remove="true"`
- links: removed if `data-uxp-remove="true"`

This is used to support standalone/local runtime without UXP:
the app can include local-only scripts/shims in `index.html`, and they will be
automatically removed when running inside UXP.

Example (local-only scripts/shims):

```html
<script src="/uhn/static/libs/development/react.development.js" data-uxp-remove="true"></script>
<script data-uxp-remove="true">
  window.uxp = { /* local runtime shim */ };
</script>
```

### Shared browser globals (bundle size optimization)

UXP currently provides some shared libraries as browser globals to keep remote
app bundles smaller.

Remote apps should mark these as webpack externals:

```js
externals: {
  react: "React",
  "react-dom": "ReactDOM",
  "@emotion/react": "emotionReact",
  "@emotion/styled": "emotionStyled",
  axios: "axios",
},
```

Local development can include these via `index.html` using `data-uxp-remove="true"`,
while UXP runtime provides them globally.

Reference script loader:
https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/download-scripts.sh

Future note: these are browser globals today; the long-term goal is to move
towards ES modules when tooling/runtime is mature enough.

## RemoteApp Shadow DOM injection (browser)

Remote apps are rendered inside a host `<div>` created by the UXP UI:

```html
<div id="remote-app-<contentUuid>"></div>
```

This host element lives in the normal (light) DOM and acts as the **ShadowRoot host**.
All remote app UI is rendered via a ShadowRoot attached to this element.

Source:
`packages/uxp-ui/src/features/remote-app/RemoteApp.tsx`
https://github.com/fisaks/uxp/blob/main/packages/uxp-ui/src/features/remote-app/RemoteApp.tsx

---

### ShadowRoot creation

When the remote app is loaded:

- a ShadowRoot is attached to the host div (or reused if it already exists)
- the ShadowRoot is fully cleared before injecting new content

The remote app never renders directly into the light DOM.

---

### What is rendered as Shadow DOM content

From the fetched HTML entry (`/content/index/:contentUuid`), UXP:

- clones all non-script nodes from `<head>` into the ShadowRoot  
  (e.g. `<style>`, `<link>`, `<meta>`)
- clones all non-script nodes from `<body>` into the ShadowRoot  
  (including the remote app root `<div data-uxp-app-identifier=...>`)

These nodes are real Shadow DOM nodes and are scoped by the ShadowRoot.

Special case:
- if the cloned node is the remote app root div,
  UXP adds:
  - `data-base-route-path="<react-router-base-path-for-remote-app>"`
  before application initialization

This value represents the React Router base path under which the remote app
is mounted inside UXP.

Remote apps must treat this value as the routing base path and configure
their internal routing accordingly (e.g. React Router basename).

---

### Script handling (important nuance)

`<script>` elements are **not cloned** as-is.

Instead:
- new `<script>` elements are created using `document.createElement("script")`
- all attributes and content are copied
- the scripts are appended under the ShadowRoot

Scripts therefore appear under the ShadowRoot in the DOM tree, **but they execute
in the global document context** (shared `window`). This is intentional: browsers
do not scope JavaScript execution to Shadow DOM; Shadow DOM scopes DOM structure
and styles, not JS execution.

---

### Remote app bundle script (loaded once)

- `data-uxp-remote-app="<appIdentifier>"`

are treated as the remote app **main bundle**.

Behavior:
- the main bundle is loaded **only once per `appIdentifier`** (cached in `fetchPromises`)
- if `window[appIdentifier]` already exists, the loader treats it as already loaded
- after the bundle is available, UXP calls:

```ts
window[appIdentifier].initApplication(shadowRoot)
```

The returned cleanup function (if any) is stored per mounted instance.

Longer term, the intention is to move away from window globals and towards
ES module–based loading once browser support, tooling, and runtime guarantees

I evaluated ES module–based approaches when writing the base UXP code, but
limitations in tooling and development workflows (such as hot reloading)
made global entry points the more reliable and, honestly, good-enough choice
for UXP so far.

---

### Unmount / cleanup

When the `RemoteApp` React component unmounts:

- the cleanup function returned by `initApplication` is called
- the ShadowRoot remains attached to the host div
- all Shadow DOM content is cleared on the next mount

### Unmount / cleanup responsibilities (remote app)

When UXP navigates away from a remote app, it calls the cleanup function
returned by `initApplication`.

Remote apps **must** use this cleanup to properly unmount their UI.

For React-based apps, this means explicitly unmounting the React root:

```ts
return () => {
    root.unmount();
};
```

Failing to unmount will cause:
- React components to remain mounted
- effects and subscriptions to continue running
- memory leaks when navigating between pages

UXP does not manage framework-level lifecycles.
Each remote app is responsible for cleaning up everything it mounted
inside `initApplication`.

## Styling model in UXP remote apps

Styling in UXP remote apps is intentionally explicit and slightly complex.
This is not accidental — it is a consequence of combining **Shadow DOM**,
**modern CSS tooling**, and **runtime-loaded micro-frontends**.

CSS is one of those areas where things appear to work until they suddenly do not.
This section documents the rules so they do not need to be rediscovered later.

---

### High-level overview

UXP uses **Shadow DOM** to isolate remote app UI from the host application.

This provides strong guarantees:
- component styles do not leak into UXP UI
- remote apps do not accidentally affect each other

However, **Shadow DOM does not automatically handle dynamically injected styles**.
Most styling libraries assume a single global `document.head`.

As a result, UXP must explicitly bridge styles into ShadowRoots.

---

## Categories of styles and how they are handled

### 1. Emotion / MUI styles (CSS-in-JS)

Emotion can be made Shadow-aware when configured with a custom cache:

```ts
const shadowCache = createCache({
  key: "shadow",
  container: shadowRoot,
});
```

This causes:
- Emotion-generated `<style>` tags to be injected directly into the ShadowRoot
- styles to apply correctly inside the remote app
- styles to remain isolated from UXP UI

This is the preferred styling path for UXP remote apps.

---

### 2. CSS Modules, imported CSS, and legacy styles

CSS Modules and imported `.css` files are **not Shadow-aware**.

They:
- are injected into `document.head` by Webpack loaders
- cannot be redirected to a ShadowRoot
- assume a global document

Without intervention, these styles would not apply inside Shadow DOM at all.

---

### 3. Style mirroring via `styleInsert`

To handle non-Emotion styles, UXP uses a style mirroring helper.

Important scope rule:

> **`styleInsert` is bundled per remote app.**  
> Each remote app bundle has its own instance of the helper and its own internal
> list of styles and registered ShadowRoots.

What it does:
- tracks dynamically inserted `<style>` and `<link>` elements **within the same app bundle**
- keeps them in `document.head` (the authoritative source)
- clones them into ShadowRoots that were registered by that same remote app

Important details:
- styles are not moved
- styles remain in `document.head`
- ShadowRoots receive cloned copies
- styles mirrored by one remote app do **not** propagate to other remote apps

This enables:
- CSS Modules
- imported CSS
- third-party runtime styles

to work correctly inside Shadow DOM without cross-app leakage.

---

## Why styles remain in `document.head`

Styles are intentionally **not removed** from `document.head`.

Reasons:
- CSS-in-JS libraries mutate existing style nodes
- hot module reloading relies on head-based updates
- browser devtools assume styles live in the head
- removing styles would break live updates and theming

Rule of thumb:

> **`document.head` is the source of truth.  
> ShadowRoots receive mirrored copies.**

---


## Why this complexity exists

Browsers were not designed for:
- multiple independently built applications
- runtime-loaded micro-frontends
- style isolation combined with shared JavaScript execution

Shadow DOM isolates DOM and styles, but:
- JavaScript still runs globally
- dynamic style injection still targets `document.head`


---

## Mental model

If you remember nothing else, remember this:

> **Emotion writes directly to Shadow DOM.  
> Everything else writes to `document.head` and is mirrored per app.**

