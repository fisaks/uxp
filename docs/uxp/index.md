# UXP Internal Documentation

This documentation provides a **high-level architectural overview** of the UXP platform.
It is written as internal notes to preserve design intent and hard-earned knowledge.

This is **not API documentation**. Field-level behavior is documented in code via JSDoc.

---

## How to read this documentation

UXP is built around a small set of deliberately separated concepts:

- apps
- pages
- routes
- navigation
- runtime loading
- styling

Each document focuses on one concept group.
Start with the overview, then jump to the area relevant to your task.

---

## Documents

- [Configuration overview](./configuration-overview.md)
- [Apps and pages](./apps-and-pages.md)
- [Routing and navigation](./routing-and-navigation.md)
- [System capabilities](./system_capabilities.md)
- [Remote app contract](./remote-app-contract.md)
- [Remote app runtime](./remote-app-runtime.md)
- [Resource proxying](./resource-proxying.md)
- [Websocket proxying](./websocket-proxying.md)
- [Styling model](./styling-model.md)
- [Browser Communication](./browser_communication.md)

---

## Design philosophy

UXP optimizes for:
- explicit contracts over magic
- runtime flexibility over build-time coupling
- functional isolation over perfect isolation

Some parts of the system are intentionally manual.
This keeps the platform debuggable and understandable long-term.
