# Browser Communication

This document describes how **UXP communicates runtime context to remote apps in the browser**.

This mechanism is **UI-only** and **not security related**.
Authentication and authorization are handled separately using JWT tokens.

---

## Core Principle

UXP exposes a small, stable browser contract via:

```ts
window.uxp
```

and notifies remote apps of changes using **Custom DOM Events**.

No shared Redux state, direct imports, or framework-level coupling exists between UXP and remote apps.

---

## User Context

UXP provides the **current user for display purposes only**.

* ✅ Intended for UI rendering and must not be trusted (names, roles, labels)

### User Shape

[https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/uxp-common/src/user/user.types.ts](https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/uxp-common/src/user/user.types.ts)

### Access Pattern

```ts
const user = window.uxp?.getUser?.();
```

### Change Notification

UXP dispatches a browser event when the user changes:

```ts
window.addEventListener("uxpUserChange", handler);
```

---

## Theme Context

UXP owns global visual consistency and shares the active MUI theme with remote apps.

### Exposed Values

```ts
window.uxp.theme
window.uxp.defaultTheme
```

### Change Notification

Theme updates are broadcast via:

```ts
window.addEventListener("uxpThemeChange", handler);
```

Remote apps react by updating their local `ThemeProvider`.

---

## Helper Components (uxp-ui-lib)

To reduce boilerplate and ensure consistent behavior, UXP provides ready-made helpers in **`uxp-ui-lib`** that remote apps can use.

### `RemoteAppListener`

`RemoteAppListener` synchronizes user context from UXP into the remote app. It has a dependency on a Redux Toolkit slice named `remote-app`.

Responsibilities:

* Reads the initial user from `window.uxp.getUser()`
* Listens for `uxpUserChange` events
* Updates the remote app state accordingly

Typical usage:

```tsx
<RemoteAppListener />
```

This component is UI-only and must not be used for security decisions.

---

### `UxpTheme`

`UxpTheme` connects the remote app to the UXP-managed MUI theme.

Responsibilities:

* Reads the initial theme from `window.uxp.theme`
* Listens for `uxpThemeChange` events
* Wraps the app in a synchronized `ThemeProvider`

Typical usage:

```tsx
<UxpTheme>
    <App />
</UxpTheme>
```

All wiring:

```tsx
return configureStore({
    reducer: {
        remoteApp: remoteAppReducer,
    },
});

<UxpTheme>
    <RemoteAppListener />
    <App />
</UxpTheme>
```

---

## Why This Approach

* Browser-native
* Shadow DOM friendly
* Framework agnostic
* Easy to debug
* Minimal and explicit contract

---

## Summary

| Context | Mechanism                                    |
| ------- | -------------------------------------------- |
| User    | `window.uxp.getUser()` + `uxpUserChange`     |
| Theme   | `window.uxp.theme` + `uxpThemeChange`        |
| Helpers | `RemoteAppListener`, `UxpTheme` (uxp-ui-lib) |
| Auth    | JWT (not via `window.uxp`)                   |

---

> **Expose runtime context, broadcast changes, never use for security decisions.**
