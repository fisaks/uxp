# Remote App Runtime

This document describes what happens in the browser when a remote app
is loaded and executed by UXP.

---

## Shadow DOM

Remote apps are rendered inside a `ShadowRoot` attached to a container element.

- DOM nodes and styles are scoped to the ShadowRoot
- Scripts execute in the global document context

This allows UI isolation while preserving normal JavaScript behavior.

### RemoteApp Shadow DOM injection (browser)

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

### Script handling

`<script>` elements from the remote app HTML are **recreated**, not cloned.

Behavior:
- For each `<script>`:
  - a new `<script>` element is created via `document.createElement("script")`
  - `src` or inline content is copied
  - all attributes are copied
  - the script is appended to the **ShadowRoot**

Although scripts appear under the ShadowRoot in the DOM, **JavaScript execution
always happens in the global document context** (`window`).
Shadow DOM scopes DOM structure and styles, not JavaScript execution.

---

### Remote app main bundle (`data-uxp-remote-app`)

Scripts with:

```html
data-uxp-remote-app="<appIdentifier>"
```

are treated as the **remote app main bundle**.

Rules:
- the bundle is loaded **only once per `appIdentifier`**
- subsequent mounts reuse the already-loaded bundle
- after the bundle is available, UXP calls:

```ts
window[appIdentifier].initApplication(shadowRoot)
```

This allows multiple content placements to reuse the same app code
while keeping UI instances isolated via Shadow DOM.

Longer term, the intention is to move away from window globals and towards
ES module–based loading once browser support, tooling, and runtime guarantees

I evaluated ES module–based approaches when writing the base UXP code, but
limitations in tooling and development workflows (such as hot reloading)
made global entry points the more reliable and, honestly, good-enough choice
for UXP so far.

---

## Lifecycle

- The remote app bundle is loaded **once per app identifier**
- `initApplication` is called **per content placement**
- The cleanup function is called when navigating away

The main remote app bundle is loaded only once per `appIdentifier`,
even if the same app is rendered multiple times on a page.
Subsequent content placements reuse the already-loaded bundle.

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

---

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

## Cleanup

The cleanup function is responsible for fully unmounting the application.
If cleanup is omitted or incomplete, the remote app will continue to exist
in memory and may keep reacting to events after navigation.

When the `RemoteApp` React component unmounts:

- the cleanup function returned by `initApplication` is called
- the ShadowRoot remains attached to the host div
- all Shadow DOM content is cleared on the next mount


#### Unmount / cleanup responsibilities (remote app)

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

## Running a remote app outside UXP

When running outside UXP, the remote app provides the same root element and
`data-*` attributes itself and initializes directly.

```ts
if (!window.__UXP_PORTAL__) {
    initApplication(document);
}
```


