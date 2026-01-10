# UXP Browser Contract

This document defines the **UXP Browser Contract**: a small, stable,
browser-level API used for **UI-only runtime communication** between UXP
and remote applications.

This contract is **not security related**. Authentication and
authorization are handled separately using JWT tokens.

---

## Core Idea

UXP exposes a minimal global object:

```ts
window.uxp
```

The contract is:

- browser-native
- framework-agnostic
- Shadow DOM friendly
- explicit and defensive

No shared Redux state, direct imports, or internal coupling exist
between UXP and remote apps.

---

## Directionality

The contract is **bidirectional**, with clear responsibility boundaries:

### UXP → Remote

UXP provides runtime **context for UI rendering** and **navigation control**.

### Remote → UXP

Remote apps **signal intent or declarative state** back to UXP.

Remote apps never issue commands.

---

## UXP → Remote Context

### User (UI-only)

```ts
window.uxp.getUser(): UserPublic | undefined
```

User changes are broadcast via:

```ts
window.addEventListener("uxpUserChange", handler);
```

[User Type](https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/uxp-common/src/user/user.types.ts)

This data is **for display only** and must not be used for
authorization.

---

### Theme (UXP-owned)

UXP is the **single authority** for theming.

Remote apps **do not choose or modify** the active theme.

UXP updates the theme by calling:

```ts
window.uxp.updateTheme(theme)
```

This:

1. sets `window.uxp.theme`
2. broadcasts a `uxpThemeChange` browser event

Remote apps must:

- treat `window.uxp.theme` as read-only
- listen for `uxpThemeChange`
- update their local `ThemeProvider` accordingly

Remote apps must **never** call `updateTheme` themselves.

------------------------------------------------------------------------

## Remote → UXP Signals

Remote apps signal declarative state via the `signal` namespace.

### Health

```ts
window.uxp.signal.health(snapshot);
```

- snapshot-based
- validated by UXP
- defined in `@uxp/common`
- aggregated and rendered by UXP

Remote apps do not assume how health is displayed.

---

## Navigation Contract

### Background

UXP hosts **multiple remote applications**, each potentially running its own
React Router instance inside a Shadow DOM.

In systems with multiple React Router instances, **each router owns its own
navigation context and history state**.

It is possible to navigate to a wildcard root route in the parent router and
include an optional sub-route in the browser URL. If the child router has
**not yet been loaded**, it will initialize itself based on the current
browser location and render the matching internal route.

However, **once the child router has been mounted**, any navigation performed
outside of that router’s own React Router context will no longer trigger
routing updates inside it. Direct URL mutations or history changes performed
by another router are not observed by the child router and do not cause it
to re-evaluate its route state.

This leads to several fundamental constraints:

- Each React Router instance maintains an **independent history stack**
- Browser back/forward buttons operate on the **browser history**, not on any
  individual router’s internal history
- Calling `navigate()` inside one router does **not** update or synchronize
  any other router

Because of this, **navigation must always be performed by the router that
owns the navigation context**.

- A router may safely navigate **within its own scope**
- A router must not attempt to control or replace navigation owned by another router
- Cross-boundary navigation requires an explicit coordination mechanism rather than direct calls to navigate()

In systems with a host router and embedded remote routers, this leads to a strict rule:

> A router may only mutate browser navigation state for routes it owns.
> Cross-boundary navigation must be coordinated explicitly.

This separation ensures:

- deterministic browser history behavior
- correct back/forward navigation
- consistent URL ↔ view synchronization
- clear ownership of routing responsibility

### UXP → Remote Navigation API

Used when UXP wants a remote app to navigate to a subpath inside its internal routes
after it has been loaded (is the active browser route/page). 

```ts
window.uxp.navigation.updateRemoteSubRoute(
  rootPath: string,
  subRoute: string
)
```

UXP calls this when:

- the base route is already active
- only the remote app’s internal route should change

The remote app listens for this signal and updates its own router.

### Remote → UXP Navigation API

Used when a remote app want to move away from it's root context to another 
route/page of UXP using the routeIdentifier as root.

```ts
window.uxp.navigation.requestBaseNavigation(
  routeIdentifier: string,
  subRoute?: string
)
```

Semantics:

- `routeIdentifier` identifies a UXP route (not a URL)
- `subRoute` is the remote app's internal path
- UXP resolves the identifier to routing metadata
- UXP decides how navigation is executed

---

## Safe Access Helper

Remote apps must assume the contract may not exist
(standalone development, tests).

Always use a helper:

```ts
const uxp = getUxpWindow();
uxp?.signal.health(snapshot);
```

This avoids unsafe casts and runtime errors.

---

## Standalone Mode

Remote apps running outside UXP must **polyfill** the contract
with no-op behavior.

Example:

```html
<script data-uxp-remove="true">
  window.__UXP_PORTAL__ = false;
  window.uxp = {
    defaultTheme: "dracula",
    updateTheme: () => {},
    getUser: () => undefined,
    signal: { health: () => {} },
    navigation: {
      requestBaseNavigation: () => {},
      updateRemoteSubRoute: () => {},
    },
  };
</script>
```

When loaded inside UXP, this script is removed.

---

## Summary

| Direction      | Context     | API |
|----------------|-------------|-----|
| UXP → Remote   | User        | `getUser()` + `uxpUserChange` |
| UXP → Remote   | Theme       | `updateTheme()` + `uxpThemeChange` |
| UXP → Remote   | Navigation  | `updateRemoteSubRoute()` |
| Remote → UXP   | Health      | `signal.health(snapshot)` |
| Remote → UXP   | Navigation  | `requestBaseNavigation()` |

