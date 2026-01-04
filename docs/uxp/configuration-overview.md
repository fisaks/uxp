# Configuration Overview

This document describes the **core concepts** of UXP and how they relate.
It intentionally avoids implementation details and focuses on system-level behavior.

---

## Core concepts

- **Apps** provide remote capabilities
- **Pages** define layout and composition
- **Page contents** define what is rendered
- **Routes** define addressability and access rules
- **Tags** define navigation structure
- **System capabilities** describe platform-level features provided by apps


A useful mental model:

- **Routes** decide *where* you can go
- **Pages** decide *what* you see
- **Tags** decide *how* you get there

Each concept is modeled explicitly and kept independent.

---

## UI resolution model

UXP assembles the UI dynamically at runtime using configuration data.

The resolution order is:

1. The current URL is matched against **routes**
2. The matching route provides:
   - access rules
   - a page identifier
3. The **page** is loaded by identifier
4. The page defines:
   - layout mode
   - an ordered list of page contents
5. Each page content entry resolves independently to:
   - an internal UXP component, or
   - a remote app instance
6. **Navigation** is derived separately using route tags

---

## Navigation model

Navigation in UXP is **derived**, not configured directly on pages.

- **Routes** define addressability and access control
- **Tags** group routes into logical navigation sets  
  (for example: header menus, sidebars, profile menus)

At runtime, UXP:

1. Loads all routes
2. Filters them based on access type and user roles
3. Groups the remaining routes by their assigned tags
4. Exposes these groups to the UI as navigation structures

Pages and page contents are not responsible for navigation.

This separation allows navigation to be reorganized, filtered, or reused
without changing page definitions or rendered content.

---

## Separation of concerns

UXP intentionally separates:

- routing from layout
- layout from content
- navigation from routing
- runtime behavior from configuration

This separation allows each concern to evolve independently and keeps
the system flexible as new apps, pages, and navigation patterns are introduced.