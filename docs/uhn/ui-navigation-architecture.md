# UHN UI Navigation Architecture

Notes on how the navigation system works — how I find, control, and interact with devices from the home page, command palette, and voice input. Writing this down so I remember the decisions and why things work the way they do when I come back to this after a while.

---

## Overview

The UHN UI is a single-page React application for home automation. The navigation system has four layers:

1. **Home page** — a scrollable grid of locations (rooms/areas), each showing tiles for views, resources, and scenes
2. **Command palette** — a search-driven interface embedded in the sticky command bar (home page) or as a floating dialog (technical pages), supporting text search and voice input
3. **Favorites** — a user-curated section that floats above all locations, with drag-and-drop reorder
4. **Technical pages** — admin-only pages for inspecting resources, views, scenes, rules, and system configuration

Navigation between these layers happens via URL routing, the command palette, or direct interaction.

---

## Home Page Layout

The home page (`LocationPage`) is the default route (`/`). It renders:

```
+-------------------------------------------+
|  Sticky Command Bar                       |
|  [ Search / Command...  ] [Location v]    |
+-------------------------------------------+
|                                           |
|  Favorites (if any)                       |
|  [tile] [tile] [tile] ...    [+N expand]  |
|                                           |
|  Kitchen                                  |
|  [tile] [tile] [tile] ...    [+N expand]  |
|                                           |
|  Living Room                              |
|  [tile] [tile] ...                        |
|                                           |
+-------------------------------------------+
```

### Location sections

Each location from the blueprint becomes a `LocationSection` with a header (name, icon, expand/collapse toggle) and a responsive tile grid. The first row of tiles is always visible; overflow items are hidden behind a collapse with a `+N` count in the header. Expanding reveals all tiles.

Tiles are interactive — tapping a tile emits a signal through the rule system (tap, toggle, setAnalog, etc.). Tile appearance reflects live state from the runtime (on/off, analog value, timer countdown).

### Tile grid

Tiles use a responsive MUI Grid2 layout: 1 tile per row on mobile (xs:12), 2 on small (sm:6), 3 on medium (md:4), 4 on large (lg:3), and 6 on wide screens (≥2200px:2 via a custom media query in `tileGridSx.ts` that overrides Grid2 CSS variables). The `useVisibleTileCount` hook returns the tile count for the current breakpoint, which determines the overflow threshold for the collapse.

### Drag-and-drop reorder

Each location section supports drag-and-drop tile reordering via `@dnd-kit`. The custom order is per user, persisted to the backend via RTK Query (`useSaveLocationItemOrderMutation`) and loaded on next visit. A "Reset order" action in the section's context menu reverts to blueprint-defined order.

Favorites have their own reorder backed by `useReorderFavoritesMutation`, which uses RTK Query optimistic updates — the UI reorders instantly and rolls back if the server request fails.

### Grid filtering

The sticky command bar's search input doubles as a grid filter. When I type text and press Enter (or select the "Filter: ..." entry), all location sections filter their tiles: only tiles matching every search token are shown. Filtering uses fuzzy matching, so "ktichen" still matches "kitchen".

---

## Sticky Command Bar

`StickyCommandBar` combines the command palette input and a location dropdown selector. It becomes fixed to the top of the viewport when scrolling past its natural position (via `useStickyOnScroll`).

The location dropdown lets me jump to any section. It shows an icon for each location (from the blueprint icon system) and includes "Top" and "Favorites" as special entries.

On mobile, the location dropdown hides when the palette input is focused to save space.

The component uses `useStickyOnScroll` to switch between in-flow and `position: fixed` based on scroll position. CSS `position: sticky` doesn't work here because the UHN app runs inside Shadow DOM and the scroll container (document body) is outside the shadow boundary. The hook measures the bar's `getBoundingClientRect().top` against `APP_BAR_HEIGHT` (64px — the UXP platform's top header height) and flips to fixed when the bar scrolls past that threshold. The in-flow box stays in the DOM as a hidden height spacer to prevent layout jumps, and `offsetWidth` is captured so the fixed bar matches the original width. This single-instance approach preserves React component state across the in-flow ↔ fixed transition — particularly important for voice recognition, which must maintain a single `SpeechRecognition` instance.

---

## Command Palette

The command palette is the primary way to interact with the system beyond direct tile taps. It's an MUI Autocomplete with several layers of functionality.

### Where it appears

- **Home page**: inline in the `StickyCommandBar`, always visible
- **Technical pages**: floating dialog opened with Ctrl+K (or Cmd+K) or via a search icon in the top bar (for touch devices without a keyboard), managed by `useCommandPaletteShortcut`

### Item types

The palette aggregates items from multiple sources into groups:

| Group | Source | Examples |
|-------|--------|---------|
| Filter | Generated from input text | "Filter: kitchen" |
| Locations | Blueprint locations + Favorites | "Kitchen", "Favorites" |
| Items | Views, resources, scenes in locations | "Kitchen Light" (scroll-to) |
| Actions | View commands, resource commands, scenes | "Turn on Kitchen Light", "Set Dimmer", "Activate Evening Scene" |
| Quick Actions | Static list + per-location expand/collapse | "Expand all", "Collapse Kitchen", "Expand Favorites" |
| Navigation | Static list (admin only) | "Home", "Technical", "Resources" |

### Search keywords and synonyms

`searchText` is pre-built by `commandPaletteSelectors.ts` and includes the group name, location name, item name, ID, description, verb aliases, and blueprint keywords.

Location entries include verb synonyms so that "locate kitchen", "find kitchen", "navigate kitchen", "go kitchen", "jump kitchen", "show kitchen", and "where kitchen" all work — both in text mode and voice mode. The constant `LOCATION_VERBS` defines these: `"locate find go navigate jump show where"`.

Navigation items include `"navigate locate open page"` as additional keywords so typing "navigate", "locate", "resources page", or "page technical" surfaces them even though the group name is "Navigation" (fuzzy match won't bridge "navigate" → "navigation" at edit distance 3).

### Search and filtering

`useCommandPaletteFilter` implements multi-token AND matching: every word in the query must match somewhere in the item's `searchText`. Matching uses fuzzy search (see Fuzzy Search section below).

**Trailing number parsing**: if the query ends with a number (e.g., "dimmer 65"), the number is extracted and used to resolve analog fallback items into concrete `setAnalog` commands with the value clamped to the item's min/max range. Negative numbers are supported for resources like temperature offsets.

### Action execution

`useCommandPaletteActions` routes each `PaletteAction` type:

- `send-command` → sends a resource command to UHN Master via WebSocket, which publishes it as an MQTT signal to the rule engine
- `execute-scene` → activates a scene (which fires its own set of commands)
- `scroll-to-location` → scrolls the home page to the location section, expanding it if needed
- `scroll-to-item` → scrolls to and highlights a specific tile with a colored ring
- `open-analog-popup` → shows the `AnalogSliderPopup` for precise value control
- `navigate` → React Router navigation
- `filter-grid` → applies the text as a home page grid filter
- `quick-action` → executes expand/collapse/refresh/etc.
- `expand-location` / `collapse-location` → expands or collapses a specific location section
- `open-system-panel` → navigates to the UXP system panel

### Keyboard interactions

- **Enter** without selecting an option: applies the typed text as a grid filter
- **Escape**: closes the dropdown (first press) or blurs the input (second press)
- **Tab**: on the home page, normal browser Tab behavior. In dialog mode: when text is present, Tab focuses the clear button; a second Tab closes the dialog. When the input is empty, Tab focuses the speaker/mic buttons instead. This prevents MUI's default Tab behavior (which would select the highlighted option and propagate a close event that dismisses the dialog).

### Analog slider popup

When an analog item is selected without a trailing number, the `AnalogSliderPopup` opens. It shows the current live value (from Redux), an editable text input, a slider, and step buttons (via `StepButtonRow`). The popup uses `zIndex: modal + 2` to render above the autocomplete Popper.

When opened from voice mode with speaker enabled, the popup reads the current value aloud via text-to-speech (TTS) (e.g., "Kitchen dimmer is at 70%. Say a number to adjust."). The value is read from Redux state (`selectRuntimeStateById`) rather than `localValue`, because the MUI Dialog keeps children mounted and `localValue` can be stale from `useState`'s initial value on the render where `open` transitions to true.

### Dialog mode (technical pages)

On technical pages, the palette opens as a dialog. The Tab key behavior is intercepted before MUI processes it (via `makeInputKeyDown` wrapping `params.inputProps.onKeyDown`). Tab focuses the clear button when there's text; when the input is empty, it focuses the speaker/mic buttons instead. A final Tab from the last button closes the dialog.

---

## Fuzzy Search

The system uses Damerau-Levenshtein distance (OSA variant) for fuzzy matching, which counts transpositions (swapped adjacent characters like "ktichen" → "kitchen") as a single edit alongside insertions, deletions, and substitutions.

### Threshold scaling

The maximum allowed edit distance scales with token length: `floor(length / 3)`.

| Token length | Max edits | Example |
|-------------|-----------|---------|
| 1-2 chars | 0 (exact only) | "on" must match exactly |
| 3-5 chars | 1 | "ligt" matches "light" |
| 6-8 chars | 2 | "ktichen" matches "kitchen" |
| 9-11 chars | 3 | Longer words tolerate more typos |

### Where it's applied

- **Command palette filter** (`useCommandPaletteFilter`): every search token is checked against each item's `searchText` via `fuzzyTokenMatch`
- **Location section grid filter** (`LocationSection`): same logic for filtering tiles
- **Favorites section filter** (`FavoritesSection`): same logic

The fast path is always checked first: if the token is an exact substring of the text, it matches immediately without computing edit distance.

### Voice exception

Voice input does **not** use fuzzy matching. Speech recognition produces real words (not typos), so fuzzy matching would create false positives — "light" and "right" are 1 edit apart but mean completely different things. Voice uses `exactTokenMatch` (simple substring check) instead.

---

## Voice Input

Voice input is layered on top of the command palette using the Web Speech API.

### Architecture

```
useSpeechRecognition (shared)
    │
    ├── useVoiceCommandFlow (orchestration)
    │       │
    │       ├── Normal flow: listen → confirm → execute
    │       ├── Filter flow: "filter ..." / "search for ..." → apply immediately
    │       ├── Bare command follow-up: "on" / "set 50" on highlighted item
    │       ├── TTS readout: optional speaker for confirmation + noop + easter eggs
    │       └── Analog redirect: when popup open, route to analog handlers
    │
    ├── useVoiceCommandResolver (intent parsing)
    │       │
    │       ├── parseVoiceIntent: extract on/off/toggle/set/execute/locate
    │       ├── filterItems: exact-match search against palette items
    │       └── resolveVoiceAction: apply action resolution matrix
    │
    └── useAnalogValueVoiceControl (analog popup)
            │
            ├── Numeric values: "fifty", "90"
            ├── Relative: "increase", "much more", "decrease"
            ├── Extremes: "maximum", "minimum"
            ├── On/off/default: "on", "turn on", "off", "default"
            └── Close: "done", "stop", "confirm", "cancel", "yes", "no", etc.
```

### Single instance pattern

There is exactly one `SpeechRecognition` instance, created in `useSpeechRecognition` and managed by `useVoiceCommandFlow`. When the analog popup opens with voice enabled, recognition results are redirected to `useAnalogValueVoiceControl` via a shared ref (`analogValueVoiceControlRef`). This avoids the complexity and browser limitations of multiple simultaneous recognition sessions.

The auto-restart effect in `useVoiceCommandFlow` is the real mechanism that keeps recognition alive across utterances. The `recognition.start()` calls sprinkled throughout phase transitions are actually no-ops (they run from within `onResult` before `onend` fires, so `listening` is still true). The effect watches `phase`, `recognition.listening`, and `ttsSpeaking` and restarts recognition when it stops unexpectedly.

### Voice command flow

1. **Idle** → tap mic button → **Listening**
2. **Listening** → speech recognized → voice resolver parses intent:
   - Match found → enter **Confirming** (or execute immediately for non-destructive actions)
   - No match → check easter eggs (questions/praise) → TTS feedback if speaker on → return to **Listening**
   - Bare command follow-up → act on highlighted item → return to **Listening**
3. **Confirming** → countdown with voice/button confirm/cancel → **Listening** (loop)
   - Without TTS: 5-second countdown starts immediately
   - With TTS: command is read aloud first, then 3-second countdown starts after speech ends
4. **Noop** → item already in desired state → show message (+ TTS if speaker on) → auto-dismiss after 2s → **Listening**
5. At any point, "stop" returns to **Idle**

### TTS / Speaker toggle

An optional speaker icon next to the mic button enables text-to-speech readout. Default off, persisted to localStorage (`uhn:voice:speaker`). The mic state is not persisted — `recognition.start()` requires a user gesture, so restoring it on reload would fail and cause a brief flash before deactivating. When enabled:

All TTS in the voice flow pauses recognition during playback (via `speakWithListenGuard` and the `ttsSpeaking` state) to prevent the speaker output from being picked up as a voice command. The auto-restart effect resumes recognition after TTS finishes.

- **Confirmation phase**: reads the matched command aloud before starting the countdown. The countdown is shorter (3s instead of 5s) since the user already heard what's about to happen.
- **Skip-confirm actions**: immediate actions also get spoken feedback when speaker is enabled:
  - `scroll-to-item`: "Found [name]. Say a command." — prompts the user to issue a bare follow-up command
  - `scroll-to-location`: "Found [name]."
  - `quick-action` / `expand-location` / `collapse-location`: "Done."
- **Noop phase**: reads the "already on/off" message aloud. Dismiss timer starts after TTS finishes.
- **No match**: speaks a random feedback line ("I didn't catch that. Try again?").
- **Easter eggs**: praise and question responses are spoken (see below).
- **Analog popup open**: reads the current value ("Kitchen dimmer is at 70%. Say a number to adjust."). Note: this TTS is fire-and-forget in `AnalogSliderPopup` and does not pause recognition (the popup doesn't have access to the voice flow's `speakWithListenGuard`).

**Race condition guard (`activeUtteranceRef`):** The `speakWithListenGuard` helper encapsulates the guarded TTS pattern. It stores the utterance in `activeUtteranceRef`, pauses recognition (`ttsSpeaking = true`), and attaches `onend`/`onerror` callbacks that check if the utterance is still the active one before proceeding. If the user cancels mid-speech (says "no", clicks cancel), `cancelSpeech()` nulls `activeUtteranceRef` before calling `speechSynthesis.cancel()` — the stale `onend` fires but sees a different ref value and bails out. All guarded TTS call sites (confirmation readout, skip-confirm feedback, noop readout, no-match feedback, easter eggs) use this helper with an optional `onDone` callback for phase-specific logic (e.g. starting the confirmation countdown).

### Easter eggs

When the voice resolver finds no matching palette item for a transcript, the system checks for easter egg phrases before showing generic "no match" feedback. This ordering is important — device commands always take priority.

**Questions** — matched by `startsWith`, so "who are you really" still triggers "who are you":
- "who are you", "who am i", "what is my name", "what can you do", "what is your name", "are you alive", "hello", "how are you"
- Responses are personalised with the user's name from the UXP user object (`firstName lastName`)

**Praise** — matched by `includes`, so "thank you very much" triggers "thank you":
- "thank you", "thanks", "good job", "well done", "awesome", "bravo", etc.
- Responses are a mix of original, Game of Thrones, and Star Wars themed quips

Easter eggs only fire when speaker is enabled and no palette item was matched.

### Voice command resolver

The resolver (`useVoiceCommandResolver`) separates voice transcripts into **intent** and **search query**, then matches and resolves items differently from text search:

**Intent parsing** extracts directional intent from the transcript:

- "turn on kitchen light" → intent: `on`, search: "kitchen light"
- "kitchen light off" → intent: `off`, search: "kitchen light"
- "set dimmer 50" → intent: `set(50)`, search: "dimmer"
- "set dimmer fifty" → intent: `set(50)`, search: "dimmer" (spoken number)
- "toggle garage door" → intent: `toggle`, search: "garage door"
- "activate evening scene" → intent: `execute`, search: "evening scene"
- "kitchen light" → intent: `locate`, search: "kitchen light"

"set" and "turn" are interchangeable command prefixes. "to", "the", "a", etc. are stop words that get stripped.

**Action resolution** applies intent-specific logic:

- **on/off**: checks `item.active` first. If already in the desired state, returns a noop with "already on/off" label and auto-dismisses. Otherwise sends the idempotent command (`activateAction` or `deactivateAction`). This check applies uniformly to all item types — both direct-set (digital/analog outputs) and toggle-only (tap, longPress). **Future caveat**: Mi-Light and similar devices don't report state back — `active` only reflects the last command UHN sent. When these resource types are added, the noop check needs to be skipped for resources with unreliable state (e.g. a `stateReliable` flag).
- **set(N)**: sends `setAnalog(N)` clamped to the item's min/max range.
- **set-open**: opens the analog popup (no number specified).
- **toggle**: uses the pre-computed state-based action (same as text palette).
- **execute**: activates a scene.
- **locate**: scrolls to the item in the grid.

### Bare command follow-up

After a "locate" intent highlights an item (e.g., "kitchen coffee socket" scrolls to it), the voice flow tracks the highlighted item for 10 seconds. When speaker is enabled, TTS reads "Found [name]. Say a command." A visible countdown in the tip text shows the remaining time and available commands. During that window, short follow-up commands act on the highlighted item without repeating its name:

- "on" / "off" / "toggle" / "set 50" / "activate"

This uses `parseBareCommand` (strict matching — only command words, no device names) and `resolveHighlightedAction` (looks up action items by kind + refId). The tile's blue ring highlight also uses the 10s duration in voice mode (5s default in text mode).

### Confirm/cancel keyword guard

After transitioning from confirming back to listening, the user's repeated "yes"/"no" may arrive as a new recognition result (speech recognition has latency). Without a guard, "yes" would become command text in the input. The `onResult` handler filters out transcripts that consist entirely of confirm/cancel keywords.

### Conditional confirmation

Not all voice commands need a countdown. The voice flow checks the resolved item's action type:

| Action | Confirmation |
|--------|-------------|
| `send-command` | Yes — 5s countdown (3s after TTS) |
| `execute-scene` | Yes |
| `scroll-to-location` | No — immediate (TTS: "Found [name].") |
| `scroll-to-item` | No — immediate (TTS: "Found [name]. Say a command.") |
| `filter-grid` | No — handled by "filter" / "search for" prefix |
| `quick-action` | No — immediate (TTS: "Done.") |
| `expand-location` / `collapse-location` | No — immediate (TTS: "Done.") |
| `navigate` to `/technical/*` | Yes |
| `navigate` to `/` | No — immediate |
| `open-analog-popup` | No — immediate |
| `open-system-panel` | No — immediate |
| No-op (already on/off) | Show message, auto-dismiss 2s |
| No match | TTS feedback if speaker on, return to listening |

### Analog voice control

When the analog slider popup is open with voice enabled, recognition results are redirected to `useAnalogValueVoiceControl`. This hook handles:

- **Numeric values**: "fifty", "90", "twenty five" → sends exact value
- **Relative adjustment**: "increase"/"decrease" (one step), "much more"/"much less" (big step)
- **Extremes**: "maximum"/"minimum" → sends max/min value
- **On/off/default**: "on", "turn on" → sends `defaultOnValue` (or max if not defined); "off", "turn off" → sends min; "default" → same as on
- **Close**: expanded keyword set including "done", "stop", "confirm", "cancel", "yes", "no", "nope", "nah", "dismiss", "exit", "quit", "back", "nevermind" — covers natural speech patterns for dismissing the popup, especially when it opens accidentally

---

## Favorites

Tiles can be marked as favorites via a star icon. Favorites appear in their own section at the top of the home page, before any location sections.

### Storage

Favorites and custom ordering are stored per user in UHN Master's MySQL database:

| Table | Entity | Purpose |
|-------|--------|---------|
| `user_favorite` | `UserFavoriteEntity` | Favorite items (`itemKind`, `itemRefId`, `sortOrder`) |
| `user_location_item_order` | `UserLocationItemOrderEntity` | Custom tile order within a location section |
| `user_location_section_order` | `UserLocationSectionOrderEntity` | Custom order of location sections on the home page |

All three are scoped by `blueprintIdentifier` + `username`. The UI caches them via RTK Query (`favoriteApi`, `useFetchLocationItemOrdersQuery`, `useFetchLocationSectionOrderQuery`).

### Reorder

Drag-and-drop in the favorites section triggers `useReorderFavoritesMutation`, which optimistically updates the RTK Query cache (instant UI feedback) and sends the new order to the server. If the server request fails, the cache rolls back to the previous state.

### Command palette integration

When favorites exist, a "Favorites" entry appears in the Locations group of the command palette. Selecting it navigates to the home page and scrolls to the favorites section (using `?scrollTo=__favorites__`). Expand/Collapse Favorites entries also appear in the Quick Actions group.

When the palette input is empty, favorite action items are shown as quick-access suggestions instead of showing nothing.

---

## Blueprint Icon System

Every item in the system (views, resources, scenes, locations) can have an icon defined in the blueprint. The icon system maps icon identifiers to MUI icon components with theme-aware colors.

### Icon categories

Icons are organized by domain: lighting, power, sensor, control, climate, opening, room, structure, scene, device, energy, garden, vehicle, and status. Each category has consistent colors.

### Color model

Each icon entry defines colors for two states across light and dark themes:

- **`active`** — icon color when the item is "on" (e.g., yellow for lights, cyan for fans)
- **`surface`** — used in two places: as the icon color for non-stateful items in the command palette (locations, scenes, navigation — things that are never "on" or "off"), and as a subtle background tint on active tiles (via `alpha(surface, 0.045–0.06)` in `useViewIconColors`)

Items with `active: true` get the `active` color. Items with `active: false` (explicitly off) get gray (`theme.palette.action.disabled`). Items with `active: undefined` (no state concept) get the `surface` color — a softer domain-specific color so they're not gray but also not as vivid as "on".

### Icon reference page

The technical section includes an icon page (`/technical/icons`) that lists all known icons with their domain, name, and visual preview. Useful when writing blueprints to find the right icon identifier.

---

## Navigation Flow

### URL routing

| Route | Page | Description |
|-------|------|-------------|
| `/` | LocationPage | Home page with all locations |
| `/technical` | TechnicalPage | Admin dashboard |
| `/technical/resources` | ResourcePage | Resource inspector |
| `/technical/resources/:itemId` | ResourcePage | Resource detail (pre-selected item) |
| `/technical/views` | ViewPage | View inspector |
| `/technical/views/:itemId` | ViewPage | View detail (pre-selected item) |
| `/technical/scenes` | ScenePage | Scene inspector |
| `/technical/scenes/:itemId` | ScenePage | Scene detail (pre-selected item) |
| `/technical/rules` | RulePage | Rule inspector |
| `/technical/rules/:itemId` | RulePage | Rule detail (pre-selected item) |
| `/technical/schedules` | SchedulePage | Schedule inspector |
| `/technical/schedules/:itemId` | SchedulePage | Schedule detail (pre-selected item) |
| `/technical/blueprints` | BlueprintListPage | Blueprint management |
| `/technical/blueprints/upload` | UploadBlueprintPage | Blueprint upload |
| `/technical/blueprints/icons` | IconPreviewPage | Icon reference (all icons with domain and name) |
| `/technical/api-tokens` | ApiTokenPage | API token management |
| `/technical/topic-trace` | TopicTracePage | MQTT topic tracer |
| `*` | LocationPage | Fallback — unknown routes redirect to home |

### Cross-page navigation via URL params

The home page reads URL search params on mount to support deferred actions from other pages:

- `?scrollTo=location-1` — scrolls to location section, expanding it if collapsed
- `?filter=kitchen` — applies grid filter
- `?highlight=view:light-1&scrollTo=location-1` — highlights specific tile
- `?quick=expand-all` — executes a quick action

Parameters are consumed immediately (cleared from URL via `replace`). The page polls for section refs to become available before scrolling, with a delay for collapse animation.

This enables flows like: command palette on a technical page → select "Kitchen" → `navigate("/?scrollTo=kitchen")` → home page scrolls to kitchen section.

---

## Key Data Flow

### UI ↔ Master communication

All real-time communication between the UI and UHN Master uses WebSocket — not REST. On connect, the UI sends a `uhn:subscribe` message with topic patterns (`resource/*`, `state/*`, `view/*`, etc.). Master responds with a `uhn:fullState` snapshot, then pushes incremental `uhn:state` updates as devices change.

Commands go the other direction: the UI sends `uhn:resource:command` via WebSocket with a resource ID and command payload. Master routes the command based on resource type — physical outputs go directly to the edge device via MQTT, while inputs/virtual resources go through the signal/rule system. Either way, the rule engine fires and may trigger side effects.

REST is only used for blueprint management (upload, activate, list) and user data (favorites, tile order).

```
UHN UI (Browser)
    │
    ├── WebSocket ──→ UHN Master (Node.js)
    │   ├── uhn:subscribe (patterns)     ──→ Master sends full state snapshot
    │   ├── uhn:resource:command          ──→ Master routes to edge or rules
    │   └── uhn:state / uhn:fullState    ←── Master broadcasts state changes
    │
    ├── Redux (runtimeState, resources, views, locations, scenes)
    │   └── Updated by WebSocket messages from Master
    │
    └── selectCommandPaletteItems (reselect)
            │
            ├── PaletteItem[] with searchText, actions, voice fields
            │
            ├── useCommandPaletteFilter (text mode)
            │       └── fuzzyTokenMatch + trailing number parsing
            │
            └── useVoiceCommandResolver (voice mode)
                    └── exactTokenMatch + intent parsing + action resolution

UHN Master (Node.js)
    │
    ├── Blueprint ──→ resources, views, locations, scenes, rules
    │   └── On activate: compiles rules, spawns sandbox, broadcasts definitions to UI
    │
    ├── Command routing (command-resource.service)
    │   ├── digitalOutput / analogOutput  ──→ MQTT to edge device directly
    │   ├── digitalInput (button sim)     ──→ signal override → rule engine fires
    │   ├── virtualDigitalInput / complex ──→ rule engine event
    │   └── timer                         ──→ MQTT to edge or master-local
    │
    ├── Rule runtime (Go sandbox, TypeScript rules)
    │   ├── Monitors: state changes, signals, events
    │   └── Emits actions: setDigitalOutput, setAnalogOutput, emitSignal, timerStart, ...
    │
    ├── State computation (state-runtime.service)
    │   ├── Physical state ←── MQTT device state from edge
    │   ├── Signal overrides ←── temporary simulation of input devices (e.g. UI
    │   │   "pressing" a button or "toggling" a switch — overrides the physical
    │   │   state until the real device state change for real, then signal clears)
    │   ├── Complex resource state ←── always computed by an algorithm from
    │   │   other resource states (e.g. "any light on" derived from all lights)
    │   └── Runtime state = Signal override ?? Physical state
    │
    └── MQTT ↔ Mosquitto broker ↔ Edge devices (Go)
```

### Redux selectors

`selectCommandPaletteItems` is the central selector that builds all palette items from runtime data. It iterates over locations and their items, creating:

- **Location entries** (group: Locations) — one per location, plus Favorites if any exist
- **Item entries** (group: Items) — deduplicated across locations, linked to scroll-to actions
- **Action entries** (group: Actions) — one or two per commandable item (toggle + analog set for analog items)
- **Quick Action entries** (group: Quick Actions) — expand/collapse per location (and per Favorites)

Each action entry includes pre-computed fields for voice: `activateAction` and `deactivateAction`. These allow the voice resolver to send idempotent commands without re-deriving them at resolution time. Noop detection checks `item.active` uniformly for all item types.

### Redux state

The command palette selector (`selectCommandPaletteItems`) reads from multiple Redux slices to build palette items. All WebSocket-sourced slices are populated on connect when Master sends the full snapshot, then kept in sync via incremental updates.

**WebSocket-sourced slices (plain Redux, updated via Master messages):**
- **`runtimeState`** — live device values (on/off, analog value, timer countdown). Determines `active` state on tiles and palette items
- **`resources`** — resource definitions (type, min/max, step, unit, defaultOnValue)
- **`views`** — interaction view definitions (icon, command type, linked resource)
- **`locations`** — location definitions (name, icon, assigned views/resources/scenes)
- **`scenes`** — scene definitions (name, icon, commands)
- **`rules`** — rule info (used on technical pages, not in command palette)

**RTK Query caches (REST-based):**
- **Favorites** — `favoriteApi`, read by `selectFavoritesData` for the palette and `useFetchFavoritesQuery` for the home page
- **Tile/section order** — `useFetchLocationItemOrdersQuery` and `useFetchLocationSectionOrderQuery`

---

## Source Files Reference

### Command palette
| File | Role |
|------|------|
| `features/command-palette/commandPalette.types.ts` | Type definitions for PaletteItem, PaletteAction, PaletteGroup, AnalogValueVoiceHandlers |
| `features/command-palette/commandPaletteSelectors.ts` | Redux selector that builds all palette items (incl. location verb synonyms, expand/collapse entries) |
| `features/command-palette/commandPaletteNavigationItems.ts` | Static navigation and quick action items (with navigate/locate/open keywords) |
| `features/command-palette/useCommandPaletteFilter.ts` | Text-mode filtering with fuzzy match and trailing numbers |
| `features/command-palette/useCommandPaletteActions.ts` | Action executor — routes palette actions to effects |
| `features/command-palette/CommandPaletteAutocomplete.tsx` | Main UI component — Autocomplete, voice integration, speaker toggle, analog popup |
| `features/command-palette/AnalogSliderPopup.tsx` | Slider popup for analog value control (with TTS readout on open) |
| `features/command-palette/useVoiceCommandResolver.ts` | Voice intent parsing, action resolution, bare command parsing |
| `features/command-palette/useVoiceCommandFlow.ts` | Voice lifecycle orchestration (listen/confirm/cancel/noop, TTS, easter eggs) |
| `features/command-palette/useAnalogValueVoiceControl.ts` | Voice handlers for the analog slider popup |

### Shared utilities
| File | Role |
|------|------|
| `features/shared/fuzzyMatch.ts` | Damerau-Levenshtein distance, fuzzyTokenMatch, exactTokenMatch, searchTokens |
| `features/shared/parseSpokenNumber.ts` | Converts spoken numbers ("fifty") and digit strings to numbers |
| `features/shared/useSpeechRecognition.ts` | Web Speech API wrapper |

### Home page
| File | Role |
|------|------|
| `features/location/pages/LocationPage.tsx` | Home page — renders locations, reads URL params |
| `features/location/components/StickyCommandBar.tsx` | Sticky search bar with palette + location dropdown |
| `features/location/components/LocationSection.tsx` | Collapsible location grid with DnD reorder |
| `features/favorite/components/FavoritesSection.tsx` | Favorites grid with DnD reorder |
| `features/view/blueprintIconMap.tsx` | Icon definitions with theme-aware colors |
| `features/favorite/favorite.api.ts` | RTK Query endpoints for favorites CRUD |
