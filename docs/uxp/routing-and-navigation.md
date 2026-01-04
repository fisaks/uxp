# Routing and Navigation

This document describes routing and navigation composition in UXP.
Routing and navigation are intentionally separated from pages and content.

---

## Routes

Routes define **which URLs exist** in UXP and **which page is rendered**.

**Source**
- [RouteEntity](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/RouteEntity.ts)

Routes:
- match URL patterns
- control visibility based on authentication and roles
- reference a page to render
- participate in navigation via tags

Routes do not define layout or content.

Wildcard routes are commonly used to host:
- remote apps
- internal components with their own nested routing (for example, control panels)

The derived base route path is passed down to rendered content (internal or remote),
which is expected to treat it as its routing base.

---

## Navigation tags

Tags define **navigation structure**, not routing behavior.
Tags group routes into named navigation sets such as menus.

**Source**
- [TagEntity](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/TagEntity.ts)

Tags:
- group routes into named navigation sets
- are used to build menus and navigation UIs
- do not affect routing or access rules

---

## Route–tag associations

Route–tag relationships bind routes into navigation groups.

**Source**
- [RouteTagsEntity](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/db/entities/RouteTagsEntity.ts)

These associations:
- bind routes to navigation tags
- optionally define ordering within a tag

---

## Navigation resolution

Navigation data is resolved server-side and filtered by access rules
before being sent to the client.

**Implementation**
- [NavigationService](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/services/navigation.service.ts)

At a high level:
- routes and tags are loaded
- access rules are applied
- invisible routes are removed
- empty tags are omitted

The client receives only:
- tag names
- ordered route identifiers
