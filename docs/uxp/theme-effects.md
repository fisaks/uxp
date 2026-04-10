# Theme Effects System

Visual and audio effects tied to UXP themes. Effects can be triggered
manually via window events, automatically at configurable intervals,
or through remote app features like buttons, actions, command palettes 
and voice control.

---

## Architecture

```
THEME_EFFECTS (uxp-ui-lib)         ← metadata: name, keywords, durationMs
    ↓
window.uxp.themeEffect             ← exposed to remote apps
    ↓
UXP_THEME_EFFECT_TRIGGER             ← trigger (dispatched by remote apps)
UXP_THEME_EFFECT_STOP        ← stop
    ↓
useThemeEffect (uxp-ui)            ← renders effect, handles dismiss
    ↓
EFFECT_COMPONENTS                  ← maps theme key → React component
```

### Key files

| File | Purpose |
|------|---------|
| `uxp-ui-lib/theme.ts` | `THEME_EFFECTS` metadata, event constants, `ThemeEffectMeta` type |
| `uxp-ui-lib/uxp-window.ts` | `themeEffect` on `UxpWindowApi` |
| `uxp-ui/useThemeEffect.tsx` | Hook: listens for events, renders effects, auto-trigger scheduling |
| `uxp-ui/useUxpTheme.ts` | Sets `window.uxp.themeEffect` on theme change |
| `uxp-ui/ThemeWrapper.tsx` | Renders effect output app-wide |
| `uxp-ui/MySettingsPage.tsx` | Settings UI: auto-trigger toggle, mode, frequency, duration |

---

## Themes with Effects

| Theme | Effect Name | Command |
|-------|-------------|---------|
| Dracula | Rise from the Coffin | "Rise from the Coffin" |
| Star Wars Dark Side | Join the Dark Side | "Join the Dark Side" |
| Rebel Alliance | May the Force Be With You | "May the Force Be With You" |
| Tatooine | Tatooine Sunset | "Tatooine Sunset" |
| Sunset | Golden Hour | "Golden Hour" |
| Winds of Winter | Winter Is Coming | "Winter Is Coming" |
| Godzilla | Godzilla Roar | "Godzilla Roar" |
| Wizard | Cast Spell | "Cast Spell" |
| Witcher | Cast Igni | "Cast Igni" |
| Light | — | No effect |

---

## Triggering Effects

### Command Palette (uhn-ui)

Three palette items appear when the active theme has an effect:

- **"{name}"** — full mode (with sound)
- **"{name} (silent)"** — visuals only, no sound
- **"Stop Effect"** — dismisses the running effect

All searchable by effect name, keywords, and theme name.

### Voice Commands

The voice resolver handles theme effects via:

- **Prefix words**: "cast", "summon", "unleash" → `theme-effect` intent
- **"stop/cancel/dismiss effect"** → maps to stop
- **Fallback**: if `locate` intent finds no matches, retries as `theme-effect` — so direct phrases like "Winter Is Coming" or "Godzilla Roar" work without a prefix

### Window Events

Remote apps can trigger effects directly:

```ts
// Trigger
window.dispatchEvent(
  new CustomEvent("uxp:theme:effect:trigger", { detail: { mode: "full" } })
);

// Stop
window.dispatchEvent(new CustomEvent("uxp:theme:effect:stop"));
```

Mode: `"full"` (with sound) or `"silent"` (visuals only).

---

## Dismissing Effects

Three methods, all equivalent:

1. **Escape** key
2. **Double-click / double-tap** anywhere
3. **"Stop Effect"** in command palette or voice

Manual triggers loop until dismissed. Auto-triggers run for the
configured duration then auto-dismiss.

---

## Auto-Trigger Settings

Persisted per-user in `UserSettingsData.themeEffect`:

```ts
type ThemeEffectSettings = {
    autoTrigger: boolean;
    mode: "full" | "silent";
    frequency: number;    // minutes: 5, 10, 15, 30, 60
    duration: number;     // seconds (0 = default one cycle)
};
```

### Behavior

- Interval is randomized: `0.5x` to `1.5x` of base frequency
- Only triggers when `document.visibilityState === "visible"`
- Skips if a manual effect is already playing
- Each tab runs independently (no cross-tab coordination)
- Auto-stop timer uses custom duration or `durationMs` from metadata

### Settings UI

Shown in My Settings when the active theme has an effect.
Toggle + mode (full/silent) + frequency select + duration select.

---

## Adding a New Theme Effect

1. **Create the component** in `uxp-ui/src/features/theme/`:
   - `MyEffect.tsx` — React component accepting `{ silent?: boolean }`
   - `MyEffect.module.css` — CSS animations
   - Use shuffled queue pattern for random events (see existing effects)
   - Guard all sound functions with `if (!silent)`

2. **Add metadata** to `THEME_EFFECTS` in `uxp-ui-lib/theme.ts`:
   ```ts
   myTheme: { name: "Effect Name", keywords: [...], durationMs: 30_000 },
   ```

3. **Register** in `EFFECT_COMPONENTS` in `useThemeEffect.tsx`:
   ```ts
   myTheme: MyEffect,
   ```

No changes needed to the command palette, voice resolver, settings UI,
or window contract — they all read from `THEME_EFFECTS` dynamically.

---

## Effect Component Patterns

### Shuffled Queue (most effects)

Events play in random order. Each event plays once before any repeats.

```ts
const queue: EventType[] = [];
function scheduleNext() {
    if (queue.length === 0) {
        queue.push(...ALL_EVENTS);
        // Fisher-Yates shuffle
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }
    }
    const event = queue.pop()!;
    // ... fire event, schedule next after duration
}
```

### Two-Tier Scheduler (Godzilla)

Mini-events play frequently. After a threshold (4-8 events), the main
event takes the next slot. Current mini-event finishes before main
starts.

### Sound Synthesis

All sounds use Web Audio API — no audio files. Common patterns:
- Bandpass-filtered noise for wind/whoosh/crackle
- Detuned oscillator pairs for thickness
- Waveshaper distortion for grit
- LFOs for vibrato/tremolo
- Delay feedback for reverb/echo

### Pre-generated Data

Always pre-generate random values (positions, sizes, delays) in
`useMemo` or `useState` initializers. Never use `Math.random()` in
JSX render — it causes re-render flicker.

### PNG Assets

Large/detailed visuals (faces, ships, medallions) use real PNG images
via `require("../../../static/image.png")`. Webpack's asset rule handles
bundling (inline base64 under 8KB, emitted file otherwise).

Compress with ImageMagick: `convert img.png -resize 300x300 -colors 128 -strip img.png`

