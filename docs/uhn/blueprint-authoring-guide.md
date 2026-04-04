# UHN Blueprint Authoring Guide

A UHN blueprint is a TypeScript project that declaratively defines your home automation system: what devices exist, how they behave, how they're grouped for the UI, and what automation rules govern them.

Blueprints are authored locally, validated and transformed at build time, and executed by the UHN runtime in a sandboxed environment.

**How it fits:**

```
Blueprint (this project)     Defines what exists and how it behaves
        |
        v
UHN Master (Node.js)         Orchestrates where/when things run
        |
        v
Edge servers (Go)             Execute physical device control
```

---

## Entity Types

A blueprint defines five entity types:

| Entity | Purpose | Directory | Required |
|--------|---------|-----------|----------|
| **Resources** | Physical and logical devices | `src/resources/` | Yes |
| **Views** | Interactive UI tiles | `src/views/` | No |
| **Scenes** | Preset command groups | `src/scenes/` | No |
| **Locations** | Room/area UI groupings | `src/locations/` | No |
| **Rules** | Automation logic | `src/rules/` | Yes |

Plus a project-level `src/factory/` directory for type-safe factory wrappers.

---

## Getting Started

### Project Structure

```
my-blueprint/
├── blueprint.json          # Project metadata
├── package.json            # Dependencies (@uhn/blueprint)
├── tsconfig.json           # TypeScript config
└── src/
    ├── factory/            # Project-level factory wrappers
    │   └── factory.ts
    ├── resources/          # Resource definitions
    │   ├── kitchen.ts
    │   └── bathroom.ts
    ├── views/              # InteractionView UI definitions (optional)
    │   └── kitchen.ts
    ├── scenes/             # Scene presets (optional)
    │   └── kitchen.ts
    ├── locations/          # Room groupings (optional)
    │   └── kitchen.ts
    ├── rules/              # Automation rules
    │   ├── kitchen_automation.ts
    │   └── bathroom_ventilation.ts
    ├── dev-filters/        # Dev filter presets (optional)
    │   └── toilet.ts
    └── helpers/            # Shared utilities (optional, any name)
        └── calculations.ts
```

**File organization within directories is flexible.** You can split files however you like — by room, by device type, by functionality, or any other scheme. Subdirectories within entity directories are supported (e.g., `src/resources/kitchen/lights.ts`). Helper and utility files can live anywhere in `src/` outside the entity directories (e.g., `src/helpers/`, `src/utils/`, `src/common/`). These non-entity files are copied to the build output as-is.

**Strict entity placement:** Each entity directory only accepts its own entity type. The build will error if you place a `rule()` call in `src/resources/` or a `view()` call in `src/rules/`.

### blueprint.json

```json
{
    "identifier": "my-home",
    "name": "My Home Blueprint",
    "description": "Home automation blueprint",
    "schemaVersion": 1
}
```

- `identifier`: Alphanumeric + hyphens, must start with a letter
- `schemaVersion`: Must be `1`

### Dependency

Blueprints depend on `@uhn/blueprint` via a local workspace link:

```json
"@uhn/blueprint": "link:../uxp/packages/uhn-blueprint/"
```

The UXP monorepo must be checked out alongside the blueprint project.

### Build

```bash
pnpm build
```

Produces `dist/blueprint.zip` — upload this to UHN Master via the CLI (see [Deploying](#deploying)).

---

## Deploying

The `uhn-blueprint` CLI can upload a built blueprint directly to UHN Master, authenticated with an API token.

### 1. Create an API Token

In the UHN admin UI, go to **Blueprints → API Tokens** and create a new token. Each token is scoped to a single blueprint identifier — it can only upload blueprints matching that identifier.

When the token is created, the UI displays it **once**. You have two options:

- **Download .uhn Config** — downloads a ready-to-use JSON config file
- **Copy** — copies the raw token string to your clipboard

### 2. Configure the CLI

Place the downloaded config file at `~/.uhn/<identifier>.json`. The directory and file must have strict permissions:

```bash
mkdir -p ~/.uhn && chmod 700 ~/.uhn
# Move or create the config file
chmod 600 ~/.uhn/my-home.json
```

The config file contains:

```json
{
    "url": "http://192.168.1.100:3005",
    "identifier": "my-home",
    "token": "<api-token>"
}
```

| Field | Description |
|-------|-------------|
| `url` | UHN Master URL (provided automatically in the download) |
| `identifier` | Blueprint identifier (must match `blueprint.json`) |
| `token` | API token (64-character hex string) |

#### Multiple Environments

To upload to different servers (e.g. production and development), create separate config files with an environment suffix:

```
~/.uhn/my-home.json       # default (no --env flag)
~/.uhn/my-home.dev.json   # used with --env dev
~/.uhn/my-home.prod.json  # used with --env prod
```

Each file has the same structure but points to a different server URL with its own API token. Rename the downloaded `.uhn` config file to include the environment suffix (e.g. `my-home.dev.json`). All config files must have `600` permissions.

### 3. Upload

Three CLI commands are available:

```bash
# Build only — produces dist/blueprint.zip
uhn-blueprint build

# Upload a previously built blueprint
uhn-blueprint upload

# Build + upload in one step
uhn-blueprint bupload
```

By default, the uploaded blueprint is **activated** immediately. To upload without activating:

```bash
uhn-blueprint upload --no-activate
uhn-blueprint bupload --no-activate
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--project <path>` | Path to blueprint project root (default: current directory) |
| `--dev-filter <name>` | Apply a dev filter preset from `src/dev-filters/` (build/bupload only) |
| `--env <name>` | Environment name — reads `~/.uhn/<identifier>.<env>.json` instead of the default config |
| `--token <token>` | API token (overrides `~/.uhn/` config) |
| `--url <url>` | UHN Master URL (overrides `~/.uhn/` config) |
| `--file <path>` | Path to blueprint zip (default: `dist/blueprint.zip`) |
| `--no-activate` | Upload without activating (default: activate) |

**Inline credentials** — you can skip the config file entirely by passing `--token` and `--url` directly. This is useful for CI/CD pipelines:

```bash
uhn-blueprint bupload --token "$UHN_TOKEN" --url "$UHN_URL" --no-activate
```

### Security Notes

- Tokens are stored as SHA-256 hashes on the server — the plain token is only shown once at creation time
- Each token is scoped to one blueprint identifier; uploading a different blueprint is rejected
- The CLI enforces `700` permissions on `~/.uhn/` and `600` on config files
- Tokens can be revoked at any time from the admin UI

---

## Object References, Not String IDs

Throughout a blueprint, entities always reference each other by their **const object**, never by a string ID:

```typescript
// ✅ Direct object reference — compiler-verified
.onTap(kitchenPanelButton)
stateFrom: [{ resource: kitchenLightCeiling }]
{ type: "setDigitalOutput", resource: kitchenLightCeiling, value: true }
{ type: "activateScene", scene: sceneKitchenEvening }
items: [viewKitchenCeilingLight, kitchenLightCeiling, sceneKitchenEvening]

// ❌ Never string IDs — no compile-time safety
.onTap("kitchenPanelButton")
stateFrom: [{ resource: "kitchenLightCeiling" }]
```

This is a deliberate design choice with two benefits:

1. **Type safety** — the compiler verifies that the referenced resource exists, has the correct type for the context (e.g., `onTap` only accepts inputs with push type, `setAnalogOutput` only accepts analog resources), and catches renamed or deleted references as errors.

2. **Build-time analysis** — the build pipeline determines where each rule executes by analyzing which resource files are imported in the rule file. If all imported resources live on the same edge, the rule runs on that edge; if they span multiple edges, it runs on master. String IDs would make this static analysis impossible.

IDs are auto-injected at build time from the export name (`export const kitchenLightCeiling` → `id: "kitchenLightCeiling"`). They exist for runtime communication between master and edges, but blueprint authors work exclusively with object references.

---

## Resources

Resources represent physical devices (lights, sensors, buttons) and logical constructs (timers, virtual inputs, complex aggregations).

All base factories (`digitalOutput`, `digitalInput`, `analogInput`, etc.) accept generic type parameters for `edge`, `device`, and `pin` values. This means the TypeScript compiler catches invalid edge names, device IDs, and pin numbers at type-check time — typos and wiring mistakes are caught before the build even runs.

### Physical Resources

Physical resources map to hardware on edge servers via `edge`, `device`, and `pin`.

| Type | Factory | Properties |
|------|---------|------------|
| `digitalInput` | `digitalInput()` | `inputKind`, `inputType` ("push" or "toggle") |
| `digitalOutput` | `digitalOutput()` | `outputKind` |
| `analogInput` | `analogInput()` | `analogInputKind`, `unit`, `decimalPrecision` |
| `analogOutput` | `analogOutput()` | `analogOutputKind`, `min`, `max`, `step`, `unit`, `options`, `decimalPrecision` |
| `actionInput` | `actionInput()` | `actionInputKind`, `actions`, per-action metadata map |
| `actionOutput` | `actionOutput()` | `actionOutputKind`, `actions` |

```typescript
import { digitalOutput, digitalInput, analogInput } from "@uhn/blueprint";

export const kitchenLightCeiling = digitalOutput({
    edge: "edge1",
    device: "D1",
    pin: 0,
    outputKind: "light",
    description: "Kitchen ceiling light",
});

export const kitchenPir = digitalInput({
    edge: "edge1",
    device: "D2",
    pin: 0,
    inputKind: "pir",
    inputType: "push",
    description: "Kitchen PIR motion sensor",
});

export const kitchenTemperature = analogInput({
    edge: "edge1",
    device: "D3",
    pin: 0,
    analogInputKind: "temperature",
    unit: "C",
    description: "Kitchen temperature sensor",
});
```

For Zigbee (Z2M) devices, `pin` is a string — the Z2M property name:

```typescript
export const kitchenTempDisplayTemperature = analogInput({
    edge: "edge1",
    device: "kitchen-temperature-display",
    pin: "temperature",
    analogInputKind: "temperature",
    unit: "°C",
});

export const socketPlug1State = digitalOutput({
    edge: "edge1",
    device: "portable-socket-plug",
    pin: "state",
    outputKind: "socket",
});
```

Analog resources can specify `decimalPrecision` to control display formatting and edge reporting precision (reduces noise from sensors that report tiny fluctuations):

```typescript
export const socketPlug1Power = analogInput({
    edge: "edge1",
    device: "portable-socket-plug",
    pin: "power",
    analogInputKind: "power",
    unit: "W",
    decimalPrecision: 0, // round to integer
});
```

### Action Input Resources

Action inputs represent transient device events like Zigbee button presses. Unlike other physical resources, they have **no persistent state** — they bypass the P/S/C (Physical/Shadow/Committed) state model entirely. Each event fires once and is consumed by rules via `.onAction()`.

Action values are string literal unions specific to each device (e.g., `"toggle" | "brightness_up_click" | "arrow_left_release"`). The `z2m-import` tool generates these from Z2M device definitions.

```typescript
import { actionInput } from "@uhn/blueprint";

// Action union — generated by z2m-import from the device's Z2M expose
type PanelActions = "toggle" | "brightness_up_click" | "brightness_down_click"
    | "arrow_left_click" | "arrow_right_click" | "arrow_left_release" | "arrow_right_release";

// Per-action metadata map — keys are action names, values are metadata types.
// `never` means no metadata for that action. Update from runtime logs when metadata is discovered.
type PanelMeta = {
    toggle: never;
    brightness_up_click: never;
    brightness_down_click: never;
    arrow_left_click: never;
    arrow_right_click: never;
    arrow_left_release: { action_duration?: number };
    arrow_right_release: { action_duration?: number };
};

export const kitchenPanel = actionInput<PanelActions, PanelMeta>({
    edge: "edge1",
    device: "kitchen-panel",
    pin: "action",
    actionInputKind: "remote",
    actions: [
        "toggle", "brightness_up_click", "brightness_down_click",
        "arrow_left_click", "arrow_right_click",
        "arrow_left_release", "arrow_right_release",
    ],
    description: "Kitchen wall panel",
});
```

The `actionInputKind` property (`"button"` or `"remote"`) affects default icon assignment. The `z2m-import` tool infers this from the device description — devices described as "remote" or "controller" get `"remote"`, others default to `"button"`.

The per-action metadata map (`TMeta`) enables type-safe metadata access in rules via `isCausedBy()` — see [Rules: .onAction()](#onaction-trigger) for details.

### Action Output Resources

Action outputs are the mirror of action inputs — they send **transient, write-only string commands** to devices (e.g. IKEA LED driver `effect: "blink"`). Like action inputs, they have **no persistent state** and bypass the P/S/C model entirely. `getState()` on an action output is a compile error (`never`).

Action outputs target Z2M device properties that are write-only enums (access bit 2 set, bit 1 not set) with non-ON/OFF values. The `z2m-import` tool detects these automatically.

```typescript
import { actionOutput } from "@uhn/blueprint";

type EffectActions = "blink" | "breathe" | "okay" | "channel_change" | "finish_effect" | "stop_effect";

export const wardrobeOverheadEffect = actionOutput<EffectActions>({
    edge: "edge1",
    device: "master-bedroom-light-wardrobe-overhead",
    pin: "effect",
    actionOutputKind: "effect",
    actions: ["blink", "breathe", "okay", "channel_change", "finish_effect", "stop_effect"],
    description: "Triggers an effect on the light",
});
```

The `actionOutputKind` property (`"effect"` or `"command"`) affects default icon assignment. Unlike action inputs, action outputs have **no metadata** — outbound commands don't need per-action metadata.

Action outputs are used in rules via `setActionOutput` and in scenes:

```typescript
ruleAction({ type: "setActionOutput", resource: wardrobeOverheadEffect, action: "blink" })
```

### Z2M Device Import Tool

Instead of writing Zigbee resources manually, use `@uhn/blueprint-tools` to generate them from Z2M:

```bash
pnpm add -D @uhn/blueprint-tools    # or link locally
npx uhn-blueprint-tools z2m-import              # reads from Z2M MQTT, generates files
npx uhn-blueprint-tools z2m-import -x           # auto-export all resources
npx uhn-blueprint-tools z2m-import --mapping-only  # only update factory mapping, no file generation
```

The tool reads `bridge/devices` from Z2M, maps exposes to UHN resource types, and generates:
- A per-edge zigbee factory (`src/factory/zigbee-factory-{edge}.ts`) with type-safe device unions
- Resource files using the factory (not exported by default — add `export` to activate, or use `-x`)
- View files with auto-wired `stateFrom`, `command`, and `stateDisplay`
- Edge config JSON snippet and per-device raw Z2M data in `.z2m/data/`

The generated factory provides type-safe device unions per edge. You can redirect resource generation to your project's own factories by editing `.z2m/factory-mapping.json` — the import tool preserves your edits on re-run. Kinds that are already mapped to a non-zigbee factory are skipped in the generated zigbee factory file.

**Recommended workflow for new devices:** Run `--mapping-only` first to update the mapping, review and redirect kinds to your project factory where appropriate, then run the full import to generate files.

**Action input generation:** For devices with an `action` expose (buttons, remotes, scene controllers), the import tool generates:
- A string literal union type for all reported action values (e.g., `type PanelActions = "toggle" | "brightness_up_click" | ...`)
- An expanded per-action metadata map type with all keys defaulting to `never` — the author updates specific actions from runtime logs when metadata structure is discovered
- The `actionInputKind` is inferred from the device description: `"remote"` for devices described as "remote" or "controller", `"button"` for everything else
- A warning comment on the action union noting that Zigbee-bound devices may silently consume some actions (the binding handles them before Z2M sees them)

### IHC Project Import Tool

The `ihc-import` command parses an LK IHC controller's project XML and generates blueprint resource files. It supports two modes: downloading the project XML from a live controller via SOAP, or reading from a local XML file.

```bash
pnpm add -D @uhn/blueprint-tools    # or link locally

# Download project from controller and generate mapping only (first run)
npx uhn-blueprint-tools ihc-import -H <ip> -P <port> -u <user> -p <pass> -c <controller> -M

# Regenerate from cached XML after editing overrides
npx uhn-blueprint-tools ihc-import -F .ihc/data/<controller>-project.xml --force -c <controller>
```

**IHC CLI options:**

| Flag | Long | Description | Default |
|------|------|-------------|---------|
| `-F` | `--file <path>` | Path to local IHC project XML file | _(none, downloads via SOAP)_ |
| `-H` | `--host <ip>` | IHC controller IP address (for SOAP download) | |
| `-P` | `--port <port>` | IHC controller port | `443` |
| `-u` | `--username <user>` | IHC username (for SOAP download) | |
| `-p` | `--password <pass>` | IHC password (for SOAP download) | |
| `-c` | `--controller <name>` | Controller device name (e.g. `"ihc2"`) | **required** |
| `-e` | `--edge <name>` | Edge name for generated resources | `edge1` |
| `-o` | `--output-dir <path>` | Output directory for generated files | `src` |
| `-f` | `--force` | Regenerate existing files (preserves export state and `// @keep` lines) | `false` |
| `-x` | `--export` | Auto-export all generated resource consts | `false` |
| `-M` | `--mapping-only` | Only update factory mapping, skip file generation | `false` |

**Override files in `.ihc/`:**

The import tool reads and writes several files in the `.ihc/` directory at the project root:

| File | Purpose |
|------|---------|
| `factory-mapping.json` | Product-level factory overrides — maps IHC product types to blueprint factories. Auto-generated with defaults on first run, author-editable. |
| `pin-mapping.json` | Per-resource factory and icon overrides. Keyed by hex resource ID. |
| `name-overrides.json` | Per-resource variable name overrides. Keyed by hex resource ID. |
| `translation-overrides.json` | Project-specific Swedish/Danish to English translations for location and product names. |
| `exclude.json` | Exclude specific locations or pins from import by name or ID. |
| `data/` | Cached project XML (downloaded via SOAP) and parsed JSON. |
| `import-history.json` | Tracks which locations have been imported and when. |

**Recommended workflow:**

1. Run with `--mapping-only` (`-M`) to download the project and generate the factory mapping without creating files.
2. Review `.ihc/factory-mapping.json` and redirect IHC product types to your project's own factory functions where appropriate.
3. Review `.ihc/pin-mapping.json` for per-resource overrides (factory, icon).
4. Add any translation overrides in `.ihc/translation-overrides.json` for location names the tool does not translate correctly.
5. Add any exclusions in `.ihc/exclude.json` (e.g. utility locations or controller link modules).
6. Run again without `--mapping-only` to generate the resource files.

**Generated file structure:** One TypeScript file per location per controller, named `{location}-{controller}.ts` (e.g. `hall-ihc2.ts`), placed in `src/resources/`. Each file contains resource definitions using your project's factory functions.

**Resources are unexported by default.** The author reviews each file and adds `export` to the resources that should be active in the blueprint. Use `--export` (`-x`) to auto-export everything. When using `--force` to regenerate files, previously exported resources retain their export state.

**Preserving custom overrides with `// @keep`:** When you manually add or change a property on a generated resource, add `// @keep` (or `//@keep`) at the end of the line. The import tool preserves these lines across `--force` re-imports, removing any auto-generated version of the same property. This works for any property — `name`, `keywords`, `icon`, `description`, etc.

```typescript
export const livingRoomLightCeilingDiningTable = outputLight({
    edge: "edge1",
    device: "ihc1",
    pin: 0x7B2A5B,
    description: "Light — I taket ovanför matbord",
    name: "Dining Table Light", // @keep
    icon: "lighting:pendant", // @keep
    keywords: ["matbord", "tak"], // @keep
});
```

On re-import with `--force`, the three `// @keep` lines are preserved. The auto-generated `icon:` is replaced by the kept version. Lines without `// @keep` are regenerated fresh from IHC project data.

### Analog Output Options

Analog outputs can define `options` — an array of `{ value, label }` pairs representing discrete named values. When present, the UI renders a select dropdown instead of a slider. This is useful for hardware modes that map to specific numeric values (e.g., effect programs, fan presets).

```typescript
import { analogOutput } from "@uhn/blueprint";

export const milightMode = analogOutput({
    edge: "edge1",
    device: "milight-1",
    pin: 9,
    analogOutputKind: "mode",
    min: 1, max: 9, step: 1, unit: "",
    options: [
        { value: 1, label: "Color Fade" },
        { value: 2, label: "White Strobe" },
        { value: 3, label: "RGBW Fade" },
        // ...
    ],
});
```

The Mi-Light factory (`milightMode()`) includes options automatically. View commands can override a resource's options via `options` on the `setAnalog` command (same pattern as `min`/`max`/`step`/`unit`).

### Logical Resources

Logical resources have `host` instead of `edge/device/pin`. They exist in software only.

| Type | Factory | Purpose |
|------|---------|---------|
| `timer` | `timer()` | Countdown timer for delayed actions |
| `virtualDigitalInput` | `virtualDigitalInput()` | Software button (push or toggle) |
| `virtualAnalogOutput` | `virtualAnalogOutput()` | Software slider (dimmer, etc.) |
| `complex` | `complex()` | Aggregate multiple resources into one |

```typescript
import { timer, virtualDigitalInput, virtualAnalogOutput } from "@uhn/blueprint";

export const kitchenTimer = timer({
    host: "edge1",
    description: "Kitchen auto-off timer",
});

export const kitchenVirtualButton = virtualDigitalInput({
    host: "master",
    inputType: "push",
    description: "Software button for kitchen scene",
});

export const kitchenDimmer = virtualAnalogOutput({
    host: "master",
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
    description: "Kitchen virtual dimmer",
});
```

### Complex Resources

Complex resources aggregate multiple sub-resources into a single computed value, displayed as one tile in the UI.

```typescript
import { complex, computeSum } from "@uhn/blueprint";

export const totalPower = complex({
    host: "master",
    description: "Total power consumption",
    unit: "W",
    stateLabel: "Power",
    computeFn: computeSum,
    computeResources: [phase1Power, phase2Power, phase3Power],
    subResources: [
        { resource: phase1Power, label: "Phase 1" },
        { resource: phase2Power, label: "Phase 2" },
        { resource: phase3Power, label: "Phase 3" },
    ],
});
```

Pre-built compute functions: `computeSum`, `computeAvg`, `computeMin`, `computeMax`, `computeAllOn`, `computeAnyOn`, `computeAllOff`, `computeOnCount`.

You can write your own compute function if the pre-built ones don't cover your use case. The signature is `ComplexComputeFn`:

```typescript
import { ComplexComputeFn } from "@uhn/blueprint";

const computeWeightedAvg: ComplexComputeFn = (values) => {
    // values: Map<Resource, boolean | number>
    const nums = [...values.values()].filter((v): v is number => typeof v === "number");
    // ... custom logic
    return result; // boolean | number
};
```

### Project Factory Pattern

Blueprints are intended to define their own factory functions in `src/factory/`, using the base factories from `@uhn/blueprint` as building blocks. This serves two purposes:

1. **Narrow types to your hardware** — define type unions for your actual edge names, device IDs, and pin ranges so the compiler catches typos and wiring mistakes
2. **Pre-fill repeated properties** — bake in `inputKind`, `outputKind`, `inputType` etc. so resource definitions stay concise

```typescript
// src/factory/factory.ts
import { digitalOutput, digitalInput } from "@uhn/blueprint";

// Project-specific type unions — only YOUR actual hardware values
type Edge = "edge1";
type OutputDevice = "DO1" | "DO2";
type InputDevice = "DI1" | "DI2";
type Pin = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type DigitalOutputProps = { edge: Edge; device: OutputDevice; pin: Pin; description?: string };
type DigitalInputProps = { edge: Edge; device: InputDevice; pin: Pin; description?: string };

// Each helper pre-fills kind/type — callers only provide edge/device/pin
export function outputLight(props: DigitalOutputProps) {
    return digitalOutput<"light", Edge, OutputDevice, Pin>({
        ...props,
        outputKind: "light",
    });
}

export function inputPir(props: DigitalInputProps) {
    return digitalInput<"pir", Edge, InputDevice, Pin>({
        ...props,
        inputKind: "pir",
        inputType: "push",
    });
}

export function inputButtonPush(props: DigitalInputProps) {
    return digitalInput<"button", Edge, InputDevice, Pin>({
        ...props,
        inputKind: "button",
        inputType: "push",
    });
}
```

With these wrappers, resource definitions are minimal and mistyping a device name is a compile error:

```typescript
import { outputLight, inputPir } from "../factory/factory";

export const kitchenLightCeiling = outputLight({
    edge: "edge1", device: "DO1", pin: 0,
    description: "Kitchen ceiling light",
});

export const kitchenPir = inputPir({
    edge: "edge1", device: "DI1", pin: 0,
    description: "Kitchen PIR motion sensor",
});

// outputLight({ edge: "edge1", device: "D01", pin: 0 });
// ❌ Type error: "D01" is not assignable to "DO1" | "DO2"
```

### Common Properties

All entities (resources, views, scenes, locations, rules) support:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (see below) |
| `name` | `string` | Display name (see below) |
| `description` | `string` | Description shown in info popover |
| `keywords` | `string[]` | Alternative search terms for the command palette (see below) |
| `icon` | `BlueprintIcon` | Override default icon (see [Icons](#icons)) |

**ID and name derivation chain:**

1. **`id`** is auto-injected from the export name at build time. `export const kitchenLightCeiling = ...` gets `id: "kitchenLightCeiling"`. You can override it by setting `id` explicitly, but there's rarely a reason to.
2. **`name`** defaults to a humanized form of the `id` with entity-type prefixes/suffixes stripped. For example: `locationKitchen` → "Kitchen", `sceneKitchenEvening` → "Kitchen Evening", `viewKitchenCeilingLight` → "Kitchen Ceiling Light". You can override `name` explicitly if the auto-derived name isn't what you want.
3. **Inside a location**, item names are further shortened by stripping the location name as a prefix. "Kitchen Ceiling Light" inside location "Kitchen" becomes just "Ceiling Light". This happens automatically — no configuration needed. Explicit `name` overrides on location items bypass this logic.

**Keywords** let users find entities by terms that don't appear in the name, description, or ID. The command palette searches keywords alongside the other text fields, so a voice command or typed query can match on any of them.

- Only add terms that aren't already covered by the `name`, `description`, or export name — those are already searchable.
- Good keywords are synonyms, informal names, or use-case terms that a user might say naturally.

```typescript
export const kitchenLightCeiling = outputLight({
    edge: "edge1", device: "DO1", pin: 0,
    description: "Main ceiling light in the kitchen area",
    keywords: ["overhead", "room light"],
});

export const sceneKitchenEvening = scene({
    name: "Kitchen Evening",
    description: "Cozy evening lighting with dining table and night light",
    keywords: ["dinner", "romantic"],
    commands: [...],
});

export const locationKitchen = location({
    name: "Kitchen",
    keywords: ["cooking", "dining area"],
    items: [...],
});
```

---

## Views

Views (InteractionViews) are **not resources**. They don't own state, don't participate in rules, and don't contain automation logic. They act as a **virtual finger interacting with the real system** — tapping a view tile simulates a button press, and the rule system reacts exactly as if the physical device had been used.

**Why views exist:** Consider a typical setup with a PIR sensor, a timer, a push button, and a light. The PIR starts the timer and turns on the light. The light turns off when the timer reaches zero. The push button toggles the light and mutes the PIR for a while. All of this is just rules — it doesn't need to be reflected in the UI structure. But in the UI you want **one tile** that captures this whole setup: tapping it controls the light through the push button, the tile's active/inactive state comes from the light, and you also want to see the timer counting down and an indicator that flashes when the PIR activates. A view brings these multiple resources together into a single coherent UI tile without duplicating any automation logic.

```typescript
import { view } from "@uhn/blueprint";

export const viewKitchenCeilingLight = view({
    // State: which resources drive the icon active/inactive
    stateFrom: [{ resource: kitchenLightCeiling }],

    // Command: what happens when the tile is tapped
    command: { resource: kitchenPanelButton, type: "tap" },

    // Secondary info displayed on the tile (slot-based layout)
    stateDisplay: {
        left: [
            { resource: kitchenTimer, label: "Timer" },
        ],
        badge: [
            { resource: kitchenPir, icon: "sensor:motion", showWhen: "active" },
        ],
    },

    icon: "lighting:ceiling",
    description: "Kitchen ceiling light with auto-off timer",
});
```

### State Sources

`stateFrom` defines which resources drive the view's active/inactive state:

```typescript
// Single digital resource — active when resource value is true
stateFrom: [{ resource: ceilingLight }]

// Analog resource with threshold — active when value > 0
stateFrom: [{ resource: dimmer, activeWhen: { above: 0 } }]

// Inverted digital — active when value is false (e.g. door contact: closed=true, open=false)
stateFrom: [{ resource: doorContact, activeWhen: { equals: false } }]

// Multiple resources with aggregation
stateFrom: [{ resource: light1 }, { resource: light2 }],
stateAggregation: "any",   // active if ANY source is active (default)
```

`activeWhen` conditions: `{ above: number }`, `{ below: number }`, `{ equals: number | boolean }`. For digital resources, `{ equals: false }` inverts the active state.

Aggregation options:
- Digital: `"any"` (default), `"all"`
- Numeric: `"sum"`, `"average"`, `"max"`, `"min"`

### Conditional Name

`nameMap` shows a different tile name based on active/inactive state:

```typescript
export const viewFrontDoor = view({
    stateFrom: [{ resource: doorContact, activeWhen: { equals: false } }],
    nameMap: { active: "Front Door Open", inactive: "Front Door Closed" },
    icon: "opening:door",
    name: "Front Door",  // fallback / search name
});
```

When `nameMap` is set, the tile displays `active` or `inactive` name based on the computed active state. The `name` field is still used as the fallback and for search/command palette.

### Commands

The `command` property defines the tile's click behavior:

| Type | Description | Example |
|------|-------------|---------|
| `"tap"` | Send tap event | Button press simulation |
| `"toggle"` | Flip digital state | Light on/off |
| `"longPress"` | Send long-press with duration | `{ type: "longPress", holdMs: 1000 }` |
| `"setAnalog"` | Inline slider or select control | `{ type: "setAnalog", min: 0, max: 100, step: 5, unit: "%" }` |
| `"clearTimer"` | Stop a running timer | Timer reset |
| `"action"` | Fire an action event | `{ type: "action", action: "toggle" }` |
| `"setActionOutput"` | Send a transient command to device | `{ type: "setActionOutput", action: "blink" }` |

#### viewCommand() Factory

`viewCommand()` is the standard way to create view commands. It provides named parameter syntax with type-safe overloads — each command type constrains the resource type at compile time.

```typescript
import { viewCommand } from "@uhn/blueprint";

// Toggle — resource must be digitalInput, virtualDigitalInput, or digitalOutput
viewCommand({ resource: kitchenLightCeiling, type: "toggle" })

// Tap — resource must be digitalInput, virtualDigitalInput, or complex
viewCommand({ resource: kitchenPanelButton, type: "tap" })

// Long press — resource must be digitalInput
viewCommand({ resource: kitchenPanelButton, type: "longPress", holdMs: 1500 })

// Set analog — resource must be analogOutput or virtualAnalogOutput
viewCommand({ resource: kitchenDimmer, type: "setAnalog", min: 0, max: 100, step: 5, unit: "%" })

// Clear timer — resource must be timer
viewCommand({ resource: kitchenTimer, type: "clearTimer" })

// Action — resource must be actionInput, action string checked against action union
viewCommand({ resource: kitchenPanel, type: "action", action: "toggle" })

// Action output — resource must be actionOutput, sends transient command to device
viewCommand({ resource: wardrobeEffect, type: "setActionOutput", action: "blink" })
```

The action overload is type-safe: the `action` string is checked against the resource's action union, and if the resource's metadata map declares a non-`never` type for that action, `metadata` becomes required:

```typescript
// If PanelMeta has arrow_left_release: { action_duration?: number }
viewCommand({
    resource: kitchenPanel,
    type: "action",
    action: "arrow_left_release",
    metadata: { action_duration: 500 },  // required by TMeta
})
```

All overloads accept `onDeactivate` for different behavior when the view is active.

**Deactivation override:** Use `onDeactivate` for different behavior when the view is active:

```typescript
command: {
    resource: toggleButton, type: "tap",
    onDeactivate: { resource: offButton, type: "tap" },
},
```

**Options override:** A `setAnalog` command can override the resource's `options` (or add options when the resource has none):

```typescript
command: {
    resource: effectModeResource, type: "setAnalog",
    options: [
        { value: 1, label: "Warm" },
        { value: 2, label: "Cool" },
    ],
},
```

When neither the command nor the resource has `options`, the UI renders the standard slider.

### State Display

Secondary information shown on the tile, organized by **slots** — named positions on the tile layout:

```
┌──────────────────────────────────┐
│ [topLeft] [topCenter] [topRight] │  ← DisplayIcon[] arrays
│                                  │
│   [left]    [ICON]    [right]    │  ← DisplayValue[] arrays
│             [badge]              │  ← DisplayIcon[] (row below icon)
│                                  │
│          Display Name            │
│            [hero]                │  ← DisplayValue[], large font, carousel if >1
└──────────────────────────────────┘
```

**DisplayValue** (for `left`, `right`, `hero` slots):

| Field | Description |
|-------|-------------|
| `resource` | The resource to read value from |
| `label` | Text label shown above value in flanking slots (omitted in hero) |
| `icon` | Icon shown instead of label text — label becomes tooltip |
| `unit` | Unit suffix (falls back to resource's own unit if omitted) |

**DisplayIcon** (for `topLeft`, `topCenter`, `topRight`, `badge` slots):

| Field | Description |
|-------|-------------|
| `resource` | The resource to read state from |
| `icon` | The default icon to display (used when no `iconMap` rule matches) |
| `tooltip` | Tooltip text, or `"value"` to show the formatted resource value + unit |
| `showWhen` | `"active"` (only visible when resource is active) or `"always"` (default) |
| `colorMap` | Value-driven color rules — first match wins (see below) |
| `iconMap` | Value-driven icon override rules — first match wins (see below) |

**`heroSize`** — Optional field on `stateDisplay` controlling hero font size. Values: `"tiny"` (1rem), `"small"` (1.25rem), `"default"` (1.5rem), `"large"` (1.75rem), `"x-large"` (2rem). Omit for `"default"`.

**Hero behavior:**
- Renders value + unit only (no label, no icon), in large centered font
- When multiple items are in the `hero` slot, they auto-rotate as a carousel with dot indicators — tapping advances to the next item
- Hero is NOT rendered when the tile has an inline analog control (from `setAnalog` command or `controls` with `inline: true`)

**colorMap and iconMap rules:**

Both use the same rule format, evaluated top-down — first matching rule wins:
- `{ above: number }` — matches when value > threshold
- `{ below: number }` — matches when value < threshold
- `{ equals: boolean }` — matches truthy (`true`) or falsy/zero (`false`)
- `{ equals: number }` — exact numeric match

`colorMap` colors are `ThemePaletteColor` literals: `"success"`, `"warning"`, `"error"`, `"info"`, `"primary"`, `"secondary"`.

`iconMap` icons override the base `icon` when a rule matches. When no rule matches, the base `icon` is used.

**Examples:**

```typescript
// Sensor tile with hero carousel and battery icon with color/icon rules
stateDisplay: {
    hero: [
        { resource: temperature, label: "Temperature" },
        { resource: humidity, label: "Humidity" },
    ],
    heroSize: "x-large",
    topRight: [
        {
            resource: battery,
            icon: "energy:battery",
            tooltip: "value",
            colorMap: [
                { below: 20, color: "error" },
                { below: 50, color: "warning" },
                { above: 49, color: "success" },
            ],
            iconMap: [
                { below: 20, icon: "energy:battery-low" },
                { below: 50, icon: "energy:battery-half" },
            ],
        },
    ],
}

// Interactive tile with flanking values and motion badge
stateDisplay: {
    left: [{ resource: timer, label: "Timer" }],
    right: [{ resource: power, label: "Power" }],
    badge: [{ resource: pir, icon: "sensor:motion", showWhen: "active" }],
}

// Flanking value with icon instead of label (renders icon + value inline)
stateDisplay: {
    left: [{ resource: power, icon: "power:energy", label: "Power" }],
}
```

Omit `command` for a display-only tile (no interaction, just shows state).

### Controls

Views can expose additional resource controls via a popover panel. This is useful when a view represents a multi-function device (e.g., an RGB+CCT light with brightness, color temperature, hue, saturation, and effects).

```typescript
export const viewToiletMilightCeiling = view({
    stateFrom: [{ resource: toiletMilightCeiling }],
    command: { resource: toiletPanelButtonTopLeft, type: "tap" },
    controls: [
        { resource: toiletMilightCeilingPower, label: "Power", group: "Power" },
        { resource: toiletMilightCeilingNightMode, label: "Night Mode" },
        { resource: toiletMilightCeilingBrightness, label: "Brightness", group: "Light", inline: true },
        { resource: toiletMilightCeilingColorTemp, label: "Color Temp" },
        { resource: toiletMilightCeilingHue, label: "Hue", group: "Color" },
        { resource: toiletMilightCeilingSaturation, label: "Saturation" },
        { resource: toiletMilightCeilingMode, label: "Effect Mode", group: "Effects" },
        { resource: toiletMilightCeilingSpeedUp, label: "Speed Up" },
        { resource: toiletMilightCeilingSpeedDown, label: "Speed Down" },
    ],
    icon: "lighting:ceiling",
    description: "Mi-Light RGB+CCT ceiling downlight with brightness control",
});
```

Each control entry:

| Field | Description |
|-------|-------------|
| `resource` | The resource to control (any type) |
| `label` | Display label in the popover (optional, falls back to resource name) |
| `group` | Section group header — controls with the same group are visually grouped |
| `inline` | When `true`, promotes an analog resource to an inline slider on the tile itself |

**Inline slider:** Only the first analog resource with `inline: true` renders as a tile slider. Digital `inline` is not yet supported (silently ignored). When the view's command is already `setAnalog`, the command slider takes precedence and `inline` is ignored.

**Popover behavior:**
- Controls present (2+ or any non-inline) → TuneIcon overlay on the tile icon; clicking it opens a popover with all controls and the view's command at the top
- Single control with `inline: true` and no other controls → inline slider on tile, no popover
- No controls → no TuneIcon, no popover

Controls use direct resource commands (press/release, setAnalog) — they interact with the physical resource directly. The view's command in the popover header uses the same view command path as tapping the tile (goes through ResourceCmdSubscriber).

**Always-enabled controls:** By default, controls are disabled when the view is inactive (all `stateFrom` values are 0/false). Set `alwaysEnableControls: true` on the view to keep controls interactive regardless of active state. Useful for group controllers where you need to adjust individual members even when all are off:

```typescript
export const viewSpotGroup = view({
    stateFrom: [{ resource: spotGroup }],
    command: viewCommand({ resource: spotGroup, type: "setAnalog", defaultOnValue: 50 }),
    controls: [
        { resource: dimmer1, label: "Bookshelf" },
        { resource: dimmer2, label: "Sofa" },
    ],
    alwaysEnableControls: true,
});
```

### Side Effects

`sideEffects` on a view fires additional action events alongside the primary command. This exists for **Zigbee binding coexistence**: when a physical button controls a device directly via Zigbee binding AND also reports to Z2M for rules, the UI view must replicate both paths — the primary command controls the device (same as the binding does physically), and side effects fire the same action events so the rules also execute from the UI.

Side effects fire from tile tap, command palette, and voice commands — anywhere the view's command fires.

```typescript
import { view, viewCommand, actionSideEffect } from "@uhn/blueprint";

export const viewKitchenCeilingLight = view({
    stateFrom: [{ resource: kitchenLightCeiling }],

    // Primary command: toggle the light (same as what the Zigbee binding does)
    command: viewCommand({ resource: kitchenLightCeiling, type: "toggle" }),

    // Side effect: fire the panel's "toggle" action so rules react as if
    // the physical button was pressed
    sideEffects: [
        actionSideEffect({ resource: kitchenPanel, action: "toggle" }),
    ],

    icon: "lighting:ceiling",
    description: "Kitchen ceiling light",
});
```

The `actionSideEffect()` factory is type-safe — the `action` string is checked against the resource's action union. If the resource's metadata map declares a non-`never` type for that action, `metadata` becomes a required property:

```typescript
actionSideEffect({
    resource: kitchenPanel,
    action: "arrow_left_release",
    metadata: { action_duration: 500 },  // required by TMeta
})
```

---

## Scenes

Scenes group multiple resource commands into reusable presets. They are activated by rules or directly from the UI.

```typescript
import { scene } from "@uhn/blueprint";

export const sceneKitchenEvening = scene({
    name: "Kitchen Evening",
    description: "Cozy evening lighting",
    icon: "scene:night",
    commands: [
        { type: "setDigitalOutput", resource: kitchenLightCeiling, value: false },
        { type: "setDigitalOutput", resource: kitchenLightDiningTable, value: true },
        { type: "setDigitalOutput", resource: kitchenLightNight, value: true },
    ],
});
```

### Scene Actions

Scenes support five action types:

| Action | Description |
|--------|-------------|
| `setDigitalOutput` | Turn a digital output on (`true`) or off (`false`) |
| `setAnalogOutput` | Set an analog value (e.g., dimmer level) |
| `emitSignal` | Emit a signal on a digital input (`true`/`false`/`undefined` for toggle) |
| `emitAction` | Fire an action event on an actionInput resource (triggers rules) |
| `setActionOutput` | Send a transient command to an actionOutput device (e.g. light effect) |

Scenes cannot activate other scenes (no recursion).

### Scene Activation from Rules

```typescript
import { rule, ruleAction } from "@uhn/blueprint";
import { sceneKitchenEvening } from "../scenes/kitchen";

export const activateEveningScene = rule({
    description: "Activate evening scene on button tap",
})
    .onTap(kitchenPanelButton)
    .run(() => [
        ruleAction({ type: "activateScene", scene: sceneKitchenEvening }),
    ]);
```

---

## Locations

Locations group resources, views, and scenes into room/area containers for the UI.

```typescript
import { location } from "@uhn/blueprint";

export const locationKitchen = location({
    name: "Kitchen",
    icon: "room:kitchen",
    items: [
        viewKitchenCeilingLight,    // view
        kitchenLightDiningTable,    // resource
        kitchenPir,                 // resource
        kitchenTimer,               // resource
        sceneKitchenEvening,        // scene
    ],
});
```

### Name Overrides

Override the display name for any item in a location:

```typescript
items: [
    { ref: kitchenLightCeiling, name: "Ceiling" },
    { ref: kitchenLightDiningTable, name: "Dining" },
],
```

---

## Rules

Rules define automation logic that reacts to resource events and produces actions.

```typescript
import { rule, ruleAction } from "@uhn/blueprint";

export const kitchenCeilingLightToggle = rule({
    description: "Toggle kitchen ceiling light on button tap",
})
    .onTap(kitchenPanelButton)
    .run((ctx) => {
        const isOn = ctx.runtime.getState(kitchenLightCeiling);
        return [
            ruleAction({ type: "setDigitalOutput", resource: kitchenLightCeiling, value: !isOn }),
        ];
    });
```

### Triggers

A rule can have multiple triggers (OR logic — any matching trigger fires the rule).

**State transitions:**

```typescript
.onActivated(resource)      // Value becomes truthy
.onDeactivated(resource)    // Value becomes falsy
.onChanged(resource)        // Value changes (any direction)
.onChanged(resource, { hysteresis: 5 })  // Only fire after 5-unit change (analog)
```

**Thresholds (analog/complex resources):**

```typescript
.onAbove(humiditySensor, 70, { hysteresis: 5 })  // Fires when value crosses above 70
.onBelow(temperature, 18, { hysteresis: 2 })      // Fires when value crosses below 18
```

Hysteresis prevents rapid re-triggering. After firing at threshold 70 with hysteresis 5, the trigger re-arms only when the value drops below 65.

**Gestures:**

```typescript
.onTap(button)                          // Button tap
.onLongPress(button, 1500)              // Long press (1.5 seconds)
```

`onTap` works with `digitalInput` (button kind), `virtualDigitalInput`, and `complex` (with `emitsTap: true`).

`onLongPress` works with `digitalInput` (button kind) only.

**Action events (actionInput):**

```typescript
.onAction(kitchenPanel, "toggle")                     // Specific action from the union
.onAction(kitchenPanel, "arrow_left_release")          // Another action — compile-time checked
```

<a id="onaction-trigger"></a>
`.onAction()` triggers when an `actionInput` resource fires a specific action. The action string is checked at compile time against the resource's action union — typos and removed actions are caught by the compiler.

Inside the `run()` callback, `ctx.cause.action` and `ctx.cause.metadata` are available but loosely typed. Use `isCausedBy()` to narrow them:

```typescript
import { rule, ruleAction, isCausedBy } from "@uhn/blueprint";

export const panelActions = rule({ description: "Handle panel button actions" })
    .onAction(kitchenPanel, "toggle")
    .onAction(kitchenPanel, "arrow_left_release")
    .run((ctx) => {
        if (isCausedBy(ctx, kitchenPanel, "toggle")) {
            const isOn = ctx.runtime.getState(kitchenLightCeiling);
            return [
                ruleAction({ type: "setDigitalOutput", resource: kitchenLightCeiling, value: !isOn }),
            ];
        }

        if (isCausedBy(ctx, kitchenPanel, "arrow_left_release")) {
            // ctx.cause.metadata is narrowed to { action_duration?: number }
            const held = ctx.cause.metadata.action_duration ?? 0;
            ctx.logger.info(`Arrow left released after ${held}ms`);
            return [...];
        }

        return [];
    });
```

**Important:** `ctx.runtime.getState()` on an `actionInput` resource is a compile error (`StateValueByResourceType<"actionInput">` resolves to `never`). Action inputs have no persistent state — use `ctx.cause.action` and `ctx.cause.metadata` from the trigger context instead.

**Timers:**

```typescript
.onTimerActivated(timer)     // Timer started
.onTimerDeactivated(timer)   // Timer expired
```

### Rule Context

The `run` callback receives a context object:

```typescript
.run((ctx) => {
    // What triggered this rule
    ctx.cause.event      // "tap", "activated", "changed", etc.
    ctx.cause.resource   // The triggering resource
    ctx.cause.timestamp  // Epoch milliseconds

    // Read current state of any resource
    const isOn = ctx.runtime.getState(someLight);        // boolean
    const temp = ctx.runtime.getState(tempSensor);       // number

    // Timer control
    ctx.timers.start(timer, minutes(5), "restart");      // "started" | "restarted" | "alreadyRunning"
    ctx.timers.start(timer, minutes(5), "startOnce");    // Won't restart if already running
    ctx.timers.clear(timer);                             // "cleared" | "notRunning"
    ctx.timers.isRunning(timer);                         // boolean

    // Logging
    ctx.logger.info("Light turned on");
    ctx.logger.debug("State:", { value: isOn });

    // Muting (suppress triggers temporarily)
    ctx.mute.rule(someRule, minutes(10), "manualOverride");
    ctx.mute.resource(someSensor, minutes(5));
    ctx.mute.clearMute(someRule, "manualOverride");

    // Repeating interval (e.g. ramp a dimmer while button is held)
    ctx.interval.start("ramp-id", { intervalMs: 200 }, (ictx) => {
        const current = ictx.runtime.getState(dimmer) as number;
        if (current >= 100) { ictx.stop(); return []; }
        return [ruleAction({ type: "setAnalogOutput", resource: dimmer, value: current + 5 })];
    });
    ctx.interval.stop("ramp-id");           // Stop from any rule
    ctx.interval.isRunning("ramp-id");      // boolean

    return [...];
});
```

### Actions

All rule actions are constructed via the `ruleAction()` factory, which provides type safety for each action type:

```typescript
// Control a digital output
ruleAction({ type: "setDigitalOutput", resource: light, value: true })

// Set an analog value
ruleAction({ type: "setAnalogOutput", resource: dimmer, value: 75 })

// Emit a signal on a digital input
ruleAction({ type: "emitSignal", resource: virtualButton, value: true })

// Emit an action event on an actionInput resource (rule chaining)
ruleAction({ type: "emitAction", resource: panel, action: "toggle" })

// Send a transient command to an actionOutput device (e.g. light effect)
ruleAction({ type: "setActionOutput", resource: wardrobeEffect, action: "blink" })

// Set a virtual resource's state silently (updates UI, does not trigger rules)
ruleAction({ type: "setVirtualState", resource: groupIndicator, value: 80 })

// Activate a scene (expands to individual commands at runtime)
ruleAction({ type: "activateScene", scene: eveningScene })
```

**`emitAction`** triggers the target resource's `onAction` rules, enabling rule chaining (e.g. PIR detects motion → emitAction simulates a button press → button's rules fire). The action string and metadata are type-checked against the resource's action union. A depth counter prevents infinite loops — the runtime rejects an `emitAction` that targets the same resource+action as the triggering cause, and the host drops events exceeding depth 10.

**`setActionOutput`** sends a write-only command directly to the device driver, bypassing the state model and rule engine. It is a terminal command — no depth tracking, no rule chaining. The action string is type-checked against the resource's action union.

**`setVirtualState`** updates a virtual resource's state value and propagates it to the UI, but does **not** trigger any rule events (`onChanged`, `onActivated`, etc.). Only works on `virtualAnalogOutput` and `virtualDigitalInput` resources. Use this when a rule needs to update a display value (e.g. a computed group indicator) without causing other rules to fire on that change. The state flows through MQTT to the master and UI like a normal state update — the "silent" flag only suppresses rule triggers.

### Scheduling

```typescript
rule({ description: "..." })
    .onTap(button)
    .suppress(2000)    // Ignore triggers for 2s after any trigger event
    .cooldown(5000)    // Block re-execution for 5s after the rule runs
    .priority(10)      // Higher priority rules execute first
    .run((ctx) => { ... });
```

- **suppress**: Filters noisy triggers *before* the rule runs. When a trigger fires, the suppress window starts and all subsequent triggers within it are silently dropped. The window is fixed — suppressed events do not extend it. The rule's `.run()` callback is never called for suppressed triggers. Use this for debouncing sensors that fire rapidly (e.g., a PIR that triggers every few hundred milliseconds).
- **cooldown**: Prevents repeated execution *after* the rule runs. After `.run()` completes, the rule is blocked from running again for the specified duration. Any triggers during the cooldown period are ignored. Use this when the rule's action should not repeat too quickly (e.g., a toggle that shouldn't fire twice if someone double-taps).

The key difference: suppress starts on **trigger**, cooldown starts on **execution**. A rule with `suppress(2000)` that receives a trigger will suppress further triggers for 2 seconds regardless of whether the rule ran. A rule with `cooldown(5000)` will accept a trigger and run, then block for 5 seconds after running.

### Action Hints

Action hints declare which resources a rule's actions typically affect. They are optional metadata for the UI — when provided, the rule detail panel shows the hinted resources alongside the trigger resources, making it easy to interact with both inputs and outputs while testing.

```typescript
export const toggleLight = rule({ description: "Toggle ceiling light" })
    .onTap(wallButton)
    .actionHints(ceilingLight)
    .run((ctx) => {
        const isOn = ctx.runtime.getState(ceilingLight);
        return [
            ruleAction({ type: "setDigitalOutput", resource: ceilingLight, value: !isOn }),
        ];
    });
```

Multiple resources can be passed:

```typescript
.actionHints(fanSpeed, ventIndicator)
```

Timers are resources too — if a rule starts, restarts, or clears a timer via `ctx.timers`, include the timer in `.actionHints()`:

```typescript
export const pirStartsTimer = rule({ description: "PIR starts auto-off timer" })
    .onActivated(pirSensor)
    .actionHints(autoOffTimer)
    .run((ctx) => {
        ctx.timers.start(autoOffTimer, minutes(10), "restart");
        return [];
    });
```

Action hints are **author-declared** — the runtime does not infer them from the `run()` function. If a rule conditionally affects different resources depending on state, list all of them. If a rule has no meaningful output resources (e.g. logging-only or scene activation), omit `.actionHints()` entirely.

In the UI:
- The **rule tile** info popover shows an "Action Hints" section with deep links to each resource.
- The **resource tile** info popover shows an "Action target of" section listing rules that hint at it.
- Selecting a rule in the rules page adds both trigger and action hint resources to the detail panel.

### Common Patterns

**PIR + auto-off timer:**

```typescript
// Rule 1: PIR activates -> start timer + turn on light
export const pirTurnsOnLight = rule({ description: "PIR turns on light" })
    .onActivated(pirSensor)
    .run((ctx) => {
        ctx.timers.start(autoOffTimer, minutes(10), "restart");
        return [
            ruleAction({ type: "setDigitalOutput", resource: light, value: true }),
        ];
    });

// Rule 2: Timer expires -> turn off light
export const timerTurnsOffLight = rule({ description: "Timer turns off light" })
    .onTimerDeactivated(autoOffTimer)
    .run(() => [
        ruleAction({ type: "setDigitalOutput", resource: light, value: false }),
    ]);
```

**Manual override with muting:**

```typescript
export const manualToggle = rule({ description: "Manual toggle with mute" })
    .onTap(wallButton)
    .run((ctx) => {
        const isOn = ctx.runtime.getState(light);

        // Mute the auto-off rule for 10 minutes after manual intervention
        ctx.mute.rule(pirTurnsOnLight, minutes(10), "manualOverride");

        return [
            ruleAction({ type: "setDigitalOutput", resource: light, value: !isOn }),
        ];
    });
```

**Threshold with hysteresis:**

```typescript
export const highHumidityFan = rule({ description: "Start fan on high humidity" })
    .onAbove(humiditySensor, 70, { hysteresis: 5 })
    .run((ctx) => {
        ctx.timers.start(ventTimer, minutes(5), "startOnce");
        return [
            ruleAction({ type: "setAnalogOutput", resource: fanSpeed, value: 80 }),
        ];
    });
```

**Dimmer ramp on button hold:**

```typescript
// Long press starts a repeating interval that ramps the dimmer.
// Uses params to track the value between ticks — avoids reading state which
// may not have updated yet if the device is slow to confirm (e.g. IHC SOAP).
export const startDimmerRamp = rule({ description: "Hold to ramp dimmer" })
    .onLongPress(wallButton, 500)
    .run((ctx) => {
        const current = ctx.runtime.getState(dimmer) as number;
        ctx.interval.start("dimmer-ramp", {
            intervalMs: 200,
            fireImmediately: true,
            initialParams: { level: current },
        }, (ictx) => {
            const level = ictx.params!.level as number;
            if (level >= 100) { ictx.stop(); return []; }
            const next = Math.min(level + 5, 100);
            ictx.setNextParams({ level: next });
            return [ruleAction({ type: "setAnalogOutput", resource: dimmer, value: next })];
        });
        return [];
    });

// Button release stops the ramp
export const stopDimmerRamp = rule({ description: "Release stops ramp" })
    .onDeactivated(wallButton)
    .run((ctx) => {
        ctx.interval.stop("dimmer-ramp");
        return [];
    });
```

Interval IDs are global — any rule can stop any interval by ID. The callback receives an `IntervalCallbackContext` with:
- `ictx.runtime` — read current state of any resource
- `ictx.logger` — logging (tagged with `interval:{id}`)
- `ictx.stop()` — stop the interval from within the callback
- `ictx.setNextInterval(ms)` — change the delay before the next tick (minimum 50ms)
- `ictx.setNextParams(params)` — pass state to the next tick via `ictx.params`
- `ictx.params` — params from the previous tick's `setNextParams()`, or `initialParams` from options
- `ictx.iteration` — zero-based tick counter

Options: `intervalMs` (minimum 50ms), `maxIterations` (default 500 — safety net), `initialParams` (seed value for `ictx.params`), `fireImmediately` (default false — first tick fires after `intervalMs`; set to true to fire the first tick immediately). Starting with an existing ID stops the old interval first. Actions are dispatched asynchronously each tick — the rule's `run()` returns immediately.

**Confirmation-aware ramp for slow devices (IHC SOAP):**

The params-based ramp above sends commands as fast as the interval ticks, which can build up a queue for slow devices like IHC SOAP controllers. On release, queued commands continue executing and the dimmer overshoots.

The fix: read confirmed state each tick and only send the next step when the device has confirmed the previous one. A `wait` flag adds one tick delay after confirmation for the physical dimmer to settle:

```typescript
function confirmationAwareRamp(dimmer: AnalogOutputResourceBase) {
    return (ictx: IntervalCallbackContext) => {
        const target = ictx.params!.level as number;
        const wait = ictx.params!.wait as boolean | undefined;
        const confirmed = ictx.runtime.getState(dimmer) as number;
        if (confirmed < target) return [];                                    // wait for device confirmation
        if (wait) { ictx.setNextParams({ level: target, wait: false }); return []; } // settle delay
        if (confirmed >= 100) { ictx.stop(); return []; }
        const next = confirmed === 0 ? 20 : Math.min(confirmed + 10, 100);
        ictx.setNextParams({ level: next, wait: true });
        return [ruleAction({ type: "setAnalogOutput", resource: dimmer, value: next })];
    };
}
```

Use a fast tick (200ms) with high `maxIterations` — most ticks are no-ops waiting for confirmation. The effective ramp speed adapts to the device. No command queue buildup, release is instant.

**Reusable interval callback with `initialParams`:**

```typescript
function rampCallback(ictx: IntervalCallbackContext) {
    const step = ictx.params!.step as number;
    const resource = ictx.params!.resource as AnalogOutputResourceBase;
    const current = ictx.runtime.getState(resource) as number;
    if (current >= 100) { ictx.stop(); return []; }
    return [ruleAction({ type: "setAnalogOutput", resource, value: current + step })];
}

// Different rules reuse the same callback with different params
ctx.interval.start("ramp-a", { intervalMs: 200, initialParams: { step: 5, resource: dimmerA } }, rampCallback);
ctx.interval.start("ramp-b", { intervalMs: 100, initialParams: { step: 1, resource: dimmerB } }, rampCallback);
```

**Debounce with interval:**

Since there's no built-in debounce primitive, you can use `ctx.interval` with `maxIterations: 1` and same-ID-replaces to debounce rapid triggers. Each trigger restarts the timer; the callback fires once after the triggers settle:

```typescript
.run((ctx) => {
    ctx.interval.start("my-debounce", { intervalMs: 300, maxIterations: 1 }, (ictx) => {
        // Fires once, 300ms after the last trigger
        const value = ictx.runtime.getState(someResource) as number;
        return [ruleAction({ type: "setVirtualState", resource: display, value })];
    });
    return [];
});
```

**Group control with `setVirtualState`:**

A single virtual resource can serve as both the display and command target for a group of dimmers. The key: a sync rule uses `setVirtualState` to update the group's display value (max of members) without triggering the fan-out rule, while the UI slider uses normal `setAnalogOutput` which does trigger it.

```typescript
// Resource: one virtual analog for both display and commands
const spotGroup = virtualAnalog({ host: "edge1", min: 0, max: 100, step: 1, unit: "%" });

// View: stateFrom and command both use the same resource
const viewSpotGroup = view({
    stateFrom: [{ resource: spotGroup }],
    command: viewCommand({ resource: spotGroup, type: "setAnalog", defaultOnValue: 50 }),
    controls: [
        { resource: dimmer1, label: "Bookshelf" },
        { resource: dimmer2, label: "Sofa" },
    ],
    alwaysEnableControls: true,
});

// Sync: update group display to max of all dimmers (silent — no fan-out triggered)
export const groupSync = rule({ description: "Sync group to max" })
    .onChanged(dimmer1).onChanged(dimmer2)
    .run((ctx) => {
        const max = Math.max(
            ctx.runtime.getState(dimmer1) as number,
            ctx.runtime.getState(dimmer2) as number,
        );
        return [ruleAction({ type: "setVirtualState", resource: spotGroup, value: max })];
    });

// Fan-out: UI slider sets all dimmers (triggers because UI uses setAnalogOutput)
export const groupFanOut = rule({ description: "Group slider sets all dimmers" })
    .onChanged(spotGroup)
    .run((ctx) => {
        const value = ctx.runtime.getState(spotGroup) as number;
        return [
            ruleAction({ type: "setAnalogOutput", resource: dimmer1, value }),
            ruleAction({ type: "setAnalogOutput", resource: dimmer2, value }),
        ];
    });
```

The pattern works because `setVirtualState` updates the resource's state (so the tile shows the correct value) but does not fire `onChanged` (so the fan-out rule only runs from UI interaction, not from the sync).

---

## Icons

Icons use a scoped `"category:name"` format. Each resource type, view command, scene, and location has a sensible default — you only need to specify `icon` when overriding.

### Categories

| Category | Examples |
|----------|---------|
| `lighting` | `bulb`, `ceiling`, `flashlight`, `indicator`, `spot` |
| `power` | `socket`, `plug`, `switch`, `energy`, `current` |
| `sensor` | `motion`, `pir`, `temperature`, `humidity`, `light`, `dark`, `co2`, `leak`, `smoke`, `fire`, `alarm`, `pressure`, `sound`, `gas`, `voltage` |
| `control` | `button`, `dimmer`, `valve`, `timer`, `schedule`, `toggle`, `speed`, `relay`, `pump`, `lock`, `blind`, `shade`, `curtain` |
| `climate` | `heater`, `ac`, `fan`, `heat-pump`, `fireplace` |
| `media` | `speaker`, `microphone`, `volume`, `tv` |
| `opening` | `door`, `window`, `gate` |
| `room` | `kitchen`, `bathroom`, `bedroom`, `living`, `hallway`, `garage`, `outdoor`, `toilet`, `sauna`, `office`, `laundry`, `terrace`, `basement`, `storage`, and more |
| `scene` | `default`, `night`, `away`, `eco`, `dining`, `tv`, `party`, `morning`, `sleep`, `movie`, `romantic`, `focus`, `welcome` |
| `device` | `router`, `wifi`, `signal`, `controller`, `gateway`, `chip` |
| `energy` | `battery`, `charging`, `solar`, `meter` |
| `garden` | `grass`, `sprinkler`, `tree`, `water` |
| `vehicle` | `ev`, `charger` |
| `status` | `dashboard`, `device`, `warning`, `error`, `ok`, `notification`, `favorite` |
| `structure` | `home`, `floor` |

### Default Icon Assignment

Icons are auto-assigned based on resource kind/type. You only need `icon` when overriding.

**Digital outputs** (`outputKind`):

| Kind | Default |
|------|---------|
| `light` | `lighting:bulb` |
| `indicator` | `lighting:indicator` |
| `socket` | `power:socket` |
| `relay` | `control:relay` |

**Digital inputs** (`inputKind`):

| Kind | Default |
|------|---------|
| `button` | `control:button` (or `control:toggle` if `inputType: "toggle"`) |
| `pir` | `sensor:pir` |
| `lightSensor` | `sensor:dark` |

**Analog inputs** (`analogInputKind`):

| Kind | Default |
|------|---------|
| `temperature` | `sensor:temperature` |
| `humidity` | `sensor:humidity` |
| `power` | `power:energy` |
| `current` | `power:current` |

**Analog outputs** (`analogOutputKind`):

| Kind | Default |
|------|---------|
| `dimmer` | `control:dimmer` |
| `valve` | `control:valve` |
| `pwm` | `control:speed` |

**Action inputs** (`actionInputKind`):

| Kind | Default |
|------|---------|
| `button` | `control:button` |
| `remote` | `control:button` |

**Logical resources**:

| Type | Default |
|------|---------|
| `timer` | `control:timer` |
| `complex` | `status:dashboard` |
| `virtualDigitalInput` | `control:button` (or `control:toggle` if `inputType: "toggle"`) |
| `virtualAnalogOutput` | `control:dimmer` |

**Views**: resolved in priority order — explicit `icon` prop → icon from single `stateFrom` resource → command type default → `status:dashboard` fallback. Command type defaults:

| Command type | Default |
|--------------|---------|
| `tap` | `control:button` |
| `toggle` | `control:toggle` |
| `longPress` | `control:button` |
| `setAnalog` | `control:dimmer` |
| `clearTimer` | `control:timer` |
| `action` | `control:button` |

**Scenes**: `scene:default`

**Locations**: `room:generic`

---

## Naming Conventions

Export names serve as entity IDs (auto-injected at build time). **These naming conventions are suggestions, not enforced by the build.** You can name exports however you like, but following a consistent pattern helps with TypeScript autocomplete — typing a prefix instantly narrows the suggestion list to the relevant group of entities.

Two patterns are used:
- **Resources** use room first: `{room}{Type}{Detail}` — typing `kitchen` lists all kitchen resources
- **Views, scenes, locations** use entity type first: `view{...}`, `scene{...}`, `location{...}` — typing `view` lists all views

### Resources

Resources follow `{room}{Type}{Detail}`:

| Resource kind | Pattern | Examples |
|---------------|---------|---------|
| Lights | `{room}Light{Detail}` | `kitchenLightCeiling`, `toiletLightMirror`, `kitchenLightNight` |
| Sockets | `{room}Socket{Detail}` | `kitchenSocketForToaster`, `kitchenSocketCoffeeMachine` |
| Indicators | `{room}PanelIndicator{Detail}` | `kitchenPanelIndicatorWallEdgeTop`, `toiletPanelIndicatorLightTop` |
| Buttons | `{room}PanelButton{Detail}` | `kitchenPanelButtonWallEdgeTopLeft`, `toiletPanelButtonBottomRight` |
| PIR sensors | `{room}Pir` | `kitchenPir`, `bathroomPir`, `toiletPirSensor` |
| Light sensors | `{room}LightSensor` | `toiletLightSensor` |
| Temperature | `{room}TemperatureSensor` | `saunaTemperatureSensor` |
| Humidity | `{room}Humidity` | `bathroomHumidity` |
| Dimmers | `{room}Dimmer{Detail}` | `bathroomDimmerCeiling` |
| Fan speed | `{room}FanSpeed` | `bathroomFanSpeed` |
| Timers | `{room}{Detail}Timer` | `kitchenCeilingTimer`, `bathroomVentTimer` |
| Virtual buttons | `{room}VirtualButton{Detail}` | `kitchenVirtualButtonCeilingLight` |
| Virtual toggles | `{room}VirtualToggle{Detail}` | `kitchenVirtualToggleNightMode` |
| Virtual dimmers | `{room}VirtualDimmer` | `kitchenVirtualDimmer` |
| Complex | `{room/device}{System}` | `bathroomVentilation`, `energyMeterTotal` |

For energy meters and similar non-room devices, the device name replaces the room prefix: `energyMeterPowerA`, `energyMeterCurrentC`.

### Other entities

| Entity | Pattern | Examples |
|--------|---------|---------|
| Views | `view{Room}{Detail}` | `viewKitchenCeilingLight`, `viewBathroomVentilation` |
| Scenes | `scene{Room}{Description}` | `sceneKitchenEvening`, `sceneKitchenLightsOff` |
| Locations | `location{Room}` | `locationKitchen`, `locationBathroom` |
| Rules | descriptive action names | `kitchenCeilingLightToggle`, `bathroomHumidityStartsVent` |

### Why this pattern

With consistent prefixes, typing `scene` in the IDE lists all scenes, `location` lists all locations, `view` lists all views, and `kitchenLight` lists all kitchen lights. Without this, entities scatter alphabetically and are harder to discover.

**Alternative: room-first with type suffix.** You can also use postfix naming for views, scenes, and locations (`kitchenCeilingLightView`, `sceneKitchenEvening` → `kitchenEveningScene`, `locationKitchen` → `kitchenLocation`). This makes typing `kitchen` show everything for that room — resources, views, scenes, and location grouped together — which can be more convenient when authoring locations. The name humanizer strips both prefixes and suffixes, so display names work either way.

Display names for the UI are derived automatically from these IDs by stripping the type prefix/suffix and humanizing (e.g., `locationKitchen` → "Kitchen", `sceneKitchenEvening` → "Kitchen Evening").

---

## Build Pipeline

Running `uhn-blueprint build` performs these stages:

### 1. Type-check

Runs the TypeScript compiler on the original source to catch type errors before transformation.

### 2. Validate

Checks that each entity factory is only used in its own directory. `rule()` calls are only allowed in `src/rules/`, `view()` in `src/views/`, `scene()` in `src/scenes/`, `location()` in `src/locations/`, and resource factories in `src/resources/`. The `src/factory/` directory may use resource factories (for building wrappers) but not rule, view, scene, or location factories. Files outside entity directories (helpers, utilities) cannot use any entity factory — they can only contain plain functions and constants.

### 3. Copy and Normalize

Source files are copied to `dist/blueprint-tmp/src/` and normalized:
- **Auto-export**: Top-level entity declarations are exported if not already
- **ID injection**: The export name becomes the `id` property (e.g., `export const kitchenLight = ...` gets `id: "kitchenLight"`)
- **Collision detection**: Duplicate IDs within the same entity type are reported as errors

### 4. Resolve Execution Targets

For each rule, the build determines where it should execute:

1. **Direct resource imports**: Extract `edge` (physical) or `host` (logical) from each imported resource
2. **Indirect imports** (scenes, utilities): DFS-trace the import chain to find resource dependencies
3. **Decision**:
   - All resources on same edge -> rule runs on that edge
   - Resources on multiple edges or imports that touch resources indirectly -> rule runs on `"master"`
   - No resource dependencies -> defaults to `"master"`

The resolved target is injected as `.executionTarget("edge1")` or `.executionTarget("master")` into the rule's builder chain.

**Important: execution target is per file, not per rule.** The build analyzes all `import` statements in the rule file. If a file imports resources from multiple edges, *every* rule in that file is promoted to master (unless it has a manual override). To avoid unintentional promotion, keep rules that touch different edges in separate files. For example, a cross-edge rule that activates a scene spanning multiple edges should be in its own file, not mixed with single-edge rules.

**Manual override**: Setting `.executionTarget()` explicitly in source code is always respected. The build will not overwrite author-set targets.

**Scene import behavior**: When a rule imports a scene that references resources from multiple edges, the rule is promoted to master. This is because edge runtimes cannot route commands cross-edge.

### 5. Resolve emitsTap

Complex resources used in `.onTap()` triggers automatically get `emitsTap: true` injected if not already set.

### 5b. Copy Dev Filter (optional)

When `--dev-filter <name>` is passed, the build copies `src/dev-filters/<name>.ts` into the temp directory. The compiled filter is included in the zip and loaded by the runtime at startup to reduce the blueprint to a subset of resources, views, rules, scenes, and locations. See [Dev Filters](#dev-filters).

### 6. Package

The transformed source is compressed into `dist/blueprint.zip` for upload to UHN Master.

### Static Analysis Constraints

The build pipeline uses ts-morph for static AST analysis. The `edge` and `host` properties must **resolve to a string literal** at build time — the build resolves one level of indirection (const references and spreads) but cannot evaluate function calls, ternaries, or chained references.

**Properties that must resolve to a string:**

| Property | Where | Why |
|----------|-------|-----|
| `id` | All entities | ID injection/collision detection (or omit for auto-injection) |
| `edge` | Physical resources | Execution target resolution |
| `host` | Logical resources | Execution target resolution |

**All of these work:**

```typescript
// Direct string literal
export const kitchenLight = digitalOutput({ edge: "edge1", device: "DO1", pin: 0, ... });

// Const reference (same file) — resolved one level to "edge1"
const EDGE = "edge1";
export const kitchenLight = digitalOutput({ edge: EDGE, device: "DO1", pin: 0, ... });

// Const reference (imported from another file)
import { EDGE } from "../helpers/constants";
export const kitchenLight = digitalOutput({ edge: EDGE, device: "DO1", pin: 0, ... });

// Spread with other common props — edge is a direct property
const commonProps = { device: "DO1", pin: 0 };
export const kitchenLight = digitalOutput({
    ...commonProps,
    edge: "edge1",
    outputKind: "light",
});

// Spread containing edge — resolved from the source object
const kitchenBase = { edge: "edge1" as const, device: "DO1" as const };
export const kitchenLight = digitalOutput({ ...kitchenBase, pin: 0, outputKind: "light" });
```

**These FAIL — cannot be resolved statically:**

```typescript
export const kitchenLight = digitalOutput({ edge: getEdge(), ... });     // function call

const A = B; const B = "edge1";
export const kitchenLight = digitalOutput({ edge: A, ... });             // chained const (2+ levels)

export const kitchenLight = digitalOutput({ edge: cond ? "e1" : "e2" }); // ternary
```

**Subdirectories are supported.** All entity directories accept nested folders (e.g., `src/resources/kitchen/lights.ts`). File collection uses recursive `**/*.ts` patterns.

**Other constraints:**

- **Entity definitions must be top-level** — the normalizer walks top-level `const` declarations looking for factory calls
- **Rules must use the builder pattern** — chained method calls: `rule({...}).onTap(...).run(...)`
- **Views, scenes, locations must be single factory calls** — `view({...})`, `scene({...})`, `location({...})`
- **IDs must be valid TypeScript identifiers** — alphanumeric + underscore, starting with a letter or underscore (no hyphens)
- **Auto-export** — top-level `const` declarations that use an entity factory call are automatically exported if you forgot `export`. You don't need to worry about missing an `export` keyword on entity definitions

**Helper files and execution targets:**

Files outside the entity directories (e.g., `src/helpers/`, `src/utils/`) are copied as-is and can contain any code. However, if a rule imports a helper that itself imports resources, the build's DFS import tracing will detect those resource dependencies. Non-resource imports that touch resources indirectly cause the importing rule to be assigned to `"master"` (since the build can't statically determine a single edge target through indirect chains).

---

## Helpers

### Duration

Convert human-readable durations to milliseconds:

```typescript
import { seconds, minutes, hours, duration } from "@uhn/blueprint";

seconds(30)                    // 30_000
minutes(5)                     // 300_000
hours(1)                       // 3_600_000
duration({ h: 1, m: 30 })     // 5_400_000
duration({ m: 2, s: 30 })     // 150_000
```

### Compute Functions

Pre-built functions for complex resources:

| Function | Description |
|----------|-------------|
| `computeSum` | Sum of all numeric values |
| `computeAvg` | Average of all numeric values |
| `computeMin` | Minimum value |
| `computeMax` | Maximum value |
| `computeAllOn` | `true` when all resources are on |
| `computeAnyOn` | `true` when any resource is on |
| `computeAllOff` | `true` when all resources are off |
| `computeOnCount` | Count of resources that are on |

You can write custom compute functions using the `ComplexComputeFn` type — see [Complex Resources](#complex-resources) for details.

---

## Dev Filters

Dev filters let you run a subset of your blueprint during development — useful when your dev edge connects to real production devices and you don't want a zillion resources active.

### Creating a Filter

Place filter presets in `src/dev-filters/`. Each file exports a `DevFilter` object with typed references to views, rules, scenes, and extra resources:

```typescript
// src/dev-filters/toilet.ts
import type { DevFilter } from "@uhn/blueprint";
import { viewToiletMilightCeiling } from "../views/toilet";
import { toiletMilightColorRule, toiletMilightWhiteRule } from "../rules/toilet";

const filter: DevFilter = {
    name: "toilet",
    views: [viewToiletMilightCeiling],
    rules: [toiletMilightColorRule, toiletMilightWhiteRule],
};
export default filter;
```

| Field | Description |
|-------|-------------|
| `name` | Required. Display name for log messages |
| `views` | Views to keep. All resources referenced by these views (stateFrom, command, controls, stateDisplay, sideEffects) are automatically included |
| `rules` | Rules to keep. Trigger resources and actionHint resources are automatically included |
| `scenes` | Scenes to keep. Command resources are automatically included |
| `extraResources` | Additional resources to include that aren't referenced by any view, rule, or scene |

### How Filtering Works

The runtime automatically resolves all resource dependencies:

1. Collects resource IDs from all referenced views, rules, scenes, and extra resources
2. Expands complex resources — sub-resources and compute dependencies are included transitively
3. Filters all services in-place (resources, views, rules, scenes)
4. Rebuilds locations — only items referencing surviving resources/views/scenes are kept; empty locations are dropped

### Usage

```bash
# Build with a dev filter
uhn-blueprint build --dev-filter toilet

# Build + upload with a dev filter
uhn-blueprint bupload --dev-filter toilet
```

---

## Debugging

Blueprints execute inside the UHN sandbox, not from `src/` directly. Breakpoints must be set in the transformed sources under `dist/blueprint-tmp/src/`, not in the original files.

For detailed debugging instructions, see the [example project's debugging guide](https://github.com/fisaks/uhn-blueprint-example#debugging-blueprints-in-the-uhn-sandbox).
