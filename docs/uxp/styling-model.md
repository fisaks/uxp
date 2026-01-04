# Styling Model

This document describes how styling works in UXP remote apps.

---

## Mental model

```
Emotion styles ─▶ ShadowRoot
Other styles   ─▶ document.head ─▶ mirrored into ShadowRoot
```

---

## Styling model in UXP remote apps

Styling in UXP remote apps is intentionally explicit and slightly complex.
This is not accidental — it is a consequence of combining:

- Shadow DOM
- modern CSS tooling
- runtime-loaded micro-frontends

CSS is one of those areas where things appear to work until they suddenly do not.
This document exists so these rules do not need to be rediscovered later.

---

## High-level overview

UXP uses **Shadow DOM** to isolate remote app UI from the host application.

This provides strong guarantees:
- remote app styles do not leak into UXP UI
- remote apps do not accidentally affect each other

However, **Shadow DOM does not automatically handle dynamically injected styles**.
Most styling tools assume a single global `document.head`.

As a result, UXP must explicitly bridge styles into ShadowRoots.

---

## Categories of styles and how they are handled

### 1. Emotion / MUI styles (CSS-in-JS)

Emotion is configured with a ShadowRoot-bound cache:

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

This is the **preferred styling approach** for UXP remote apps.


### 2. CSS Modules, imported CSS, and legacy styles

CSS Modules and imported `.css` files are **not Shadow-aware**.

They:
- are injected into `document.head` by Webpack loaders
- assume a global document
- cannot target a ShadowRoot directly

Without intervention, these styles would not apply inside Shadow DOM at all.

#### Style mirroring via `styleInsert`

To support non-Emotion styles, UXP uses a style mirroring helper.

Important scope rule:

> **`styleInsert` is bundled per remote app.**  
> Each remote app bundle has its own instance and its own internal registry.

What it does:
- tracks dynamically inserted `<style>` and `<link>` elements **within the same app bundle**
- keeps them in `document.head` (the authoritative source)
- clones them into ShadowRoots registered by that same remote app

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


### Why styles remain in `document.head`

Styles are intentionally **not removed** from `document.head`.

Reasons:
- CSS-in-JS libraries mutate existing style nodes
- hot module reloading relies on head-based updates
- browser devtools assume styles live in the head
- removing styles would break live updates and theming

Rule of thumb:

> **`document.head` is the source of truth.  
> ShadowRoots receive mirrored copies.**

#### Why this complexity exists

Browsers were not designed for:
- multiple independently built applications
- runtime-loaded micro-frontends
- style isolation combined with shared JavaScript execution

Shadow DOM isolates DOM and styles, but:
- JavaScript still runs globally
- dynamic style injection still targets `document.head`

---

## Final mental model

If you remember nothing else, remember this:

> **Emotion writes directly to Shadow DOM.  
> Everything else writes to `document.head` and is mirrored per app.**