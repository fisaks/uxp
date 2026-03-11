# UHN UI Navigation & Interaction Plan

## Core Principles

- **Single control path** — UI must never bypass the rule system. All interaction flows through `emitSignal(resource) → rule → resource`.
- **Location-assigned items are the safe interaction surface** — If it's in a location, the blueprint author intentionally exposed it with rules backing it.
- **Command palette only targets location-assigned items** — Never generate commands to arbitrary resources.
- **Scenes are valid command palette actions** — If a scene targets a resource and is in a location, the blueprint author is assumed to have the rules backing it in place.

## Home Page (`/`)

- Locations page is the only home page.
- No left sidebar in any mode.
- **Top bar**: Search input (command palette trigger) + location switcher dropdown, side by side.
  - Desktop: both full size, no adaptation needed.
  - Mobile: share one row, switcher shrinks when search focused, `max-width` with truncation on long names.
  - Scroll-adaptive dropdown sizing deferred to later.
- **Favorites section**: Topmost section, behaves like a location (one row collapsed, expandable).
  - Per-user items from across all locations, stored in DB.
  - Manual ordering only (drag-and-drop), stored as ordered list in DB. Same across all user's devices.
- **Location sections**: All visible as collapsed rows (one tile row each), expandable to show all.
  - Pinned tiles appear first (pinning overrides usage ordering).
  - Only first row rendered when collapsed (~500 device performance).
  - Tile ordering: pinned → most interacted → remaining.
- **Location switcher**: Dropdown at top, selecting scrolls to that section. Intersection observer updates the dropdown value as user scrolls to reflect current visible section.
- **Tile icons**: Favorite star top-right, pin icon top-left. Visible on hover (desktop) or always visible (mobile) — exact interaction to be decided during implementation.

## Technical Section (`/technical`)

- Landing page with badge/card grid linking to sub-sections.
- Accessible via System Panel quick links or direct URL.
- Each sub-page has back/breadcrumb navigation.
- All routes support deep linking (e.g., `/technical/resources/kitchenPanelButtonCountertopTopRow`).
- Sub-sections:
  - `/technical/blueprints`
  - `/technical/blueprints/upload`
  - `/technical/blueprints/icons`
  - `/technical/api-tokens`
  - `/technical/resources`
  - `/technical/views`
  - `/technical/scenes`
  - `/technical/rules`
  - `/technical/topic-trace`
- Each page (Resources, Views, Scenes, Rules) has inline free text search at the top filtering by name, ID, and technical details (edge/master).

## Command Palette

- Combined search + command palette, single component.
- Custom MUI implementation, client-side derived from Redux store.
- **Home page**: Persistent search input at top, scoped to:
  - Location-assigned items (views, resources, scenes).
  - Actions derived from capabilities of those items.
  - Navigation commands ("Go to Resources", "Go to Rules", etc.).
- **Technical pages**: Ctrl+K (or palette icon) opens command palette as overlay on top of the page.
- Results grouped by type with visual distinction between navigation and actions.
- Ctrl+K shortcut works everywhere on desktop.

## Rules in UI

- Rules page in technical section.
- Shows where each rule lives (master or edge).
- Rules and their triggers visible.
- Must be implemented before command palette (so commands can reference rules).

## Usage-Based Ordering

- Slow adaptation — locations and tiles shift gradually, not after one interaction.
- Pinning always overrides usage.
- Interaction tracking stored in UHN database.
- User preference with three options:
  - Disable
  - Adapt on my usage
  - Adapt on all user usage

## UXP Control Panel Extension

- UXP control panel exists under profile icon in topbar.
- Currently only supports UXP-level settings.
- Needs extension to support remote app settings.
- Remote apps (UHN, H2C, etc.) can register their own preference sections.
- UHN preferences (usage-based ordering, future preferences) appear as a UHN section in the control panel.

## Phases

1. **Navigation restructuring** — Remove sidebar, locations as home, technical section landing page with badges, breadcrumb navigation, update System Panel quick links.
2. **Expandable locations with pinned tiles** — Collapsed/expandable location sections, pinned tile ordering, location switcher dropdown with scroll-to and intersection observer, performance (render only first row when collapsed).
3. **Favorites** — Top section on home page, per-user stored in DB, behaves like a location, manual drag-and-drop ordering.
4. **Technical section search + deep linking** — Inline free text filter on Resources/Views/Scenes/Rules pages, deep linking to specific items.
5. **Rules delivery + UI** — Rules page in technical section, master/edge indicator, triggers visible.
6. **Command palette** — Search input on home, overlay on technical pages, client-side derived commands from location-assigned items.
7. **UXP control panel remote app settings** — Extend UXP control panel to support remote app preference sections.
8. **Usage-based ordering** — Interaction tracking in DB, slow adaptation, user preference via UXP control panel.
