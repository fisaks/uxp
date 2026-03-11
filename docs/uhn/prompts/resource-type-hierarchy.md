# Resource Type Hierarchy — Design Discussion

## Current Problem

`ResourceBase` requires `edge: string` and has optional `device` and `pin`. This forces every resource type — including complex and timer — to carry fields that don't apply to them. Complex resources have no device or pin. Timers have no device or pin either — they're just hosted on an edge (and in the future, on master too).

## Orthogonal Dimensions

"Physical vs logical" is too simplistic as a primary distinction. Resources have at least three independent dimensions:

### 1. Addressability — Does it have a hardware address?

- Digital/analog I/O: yes (edge + device + pin). Protocol (Modbus, Zigbee, IHC, etc.) is an edge implementation detail.
- Timer: no (hosted on edge or master, but no hardware address)
- Complex: no

### 2. Runtime State Ownership — Where does authoritative state live?

- Digital/analog I/O: edge (hardware poll)
- Timer: edge today, master in future
- Complex (computed): master (derived from sub-resources via compute function)
- Complex (primary/carousel): **no own state** — UI projections of sub-resource states

### 3. Commandability — Can you send commands to it?

- Digital output, analog output: yes (direct hardware write)
- Digital input: simulated (press/release for UI testing)
- Analog input: no (read-only)
- Timer: yes (start/stop/reset)
- Complex: currently no — commands target sub-resources directly

## What "Complex" Is Today

The current complex resource type conflates three distinct concepts:

**A. UI grouping** (primary/carousel) — "show these resources together on one tile." No own state, no commands. Purely a display concern.

**B. Computed aggregate** (computed) — "derive a value from sub-resources." Has real state in the runtime (master-computed). Read-only. Example: energy meter total power = sum of 3 phases.

**C. Human concept mapping** — not yet properly supported. See below.

Only mode `computed` complex resources are true runtime resources. `primary` and `carousel` are UI projections with no runtime state.

## The Missing Concept: Human-Centric Resources ("Things")

The most important gap in the current model. A human thinks "ceiling light on/off", not "toggle kitchen_relay8_1 pin 0". A ceiling light involves multiple physical resources:

- A **button** (digital input) — the physical control
- A **relay** (digital output) — switches the light
- An **indicator LED** (digital output) — shows on/off state

To a user this is one thing. They shouldn't have to find the button resource and click it, then go to the relay resource to see if it turned on.

### Command routing is not simple

A naive approach maps thing.toggle() → relay.toggle(). **This is wrong.** In the physical world you press the button, a rule fires, and the rule toggles the relay + starts a 30-min auto-off timer + updates the indicator + checks conditions. Commanding the relay directly bypasses all rule logic.

The correct command path is: thing.toggle() → simulate button press → rules fire → everything happens correctly.

**But this only works when a physical input exists.** Real scenarios are more varied:

| Scenario | State from | Command to | Notes |
|----------|-----------|------------|-------|
| Button + relay + indicator | Relay | Button (simulate press) | Rules orchestrate everything |
| One button → N relays | Multiple relays (aggregate) | Button (simulate press) | "Kitchen Lights" = 3 relays, one button |
| N sockets as one tile | Multiple outputs (aggregate) | Outputs directly | No physical button exists, toggle all |
| Output with no physical input | Output | Output directly | Relay only controllable from UI |
| Dimmer + toggle button | Analog output | Button for toggle, analog output for dim | Mixed: toggle through rules, dim directly |

Command routing depends entirely on the scenario. Sometimes through an input (to leverage rules), sometimes directly to outputs (no input exists), sometimes both (toggle through rules, dim directly).

### State is also not simple

- Single source: relay state IS the light state
- Aggregate: 4 sockets → all on / all off / mixed
- Computed: energy meter total = sum of phases

## The Grouping Gap

Resources are defined in files by room (kitchen.ts, bathroom.ts) but this grouping is lost at runtime. The UI shows a flat list of all resources. For a developer/installer, this works. For a consumer, the mental model is:

- **Spaces** — Kitchen, Bathroom, Upstairs (where things are)
- **Things** — Ceiling Light, Dimmer, Temperature (what you interact with)
- **Scenes** — Movie Night, Good Morning (presets across multiple things)

None of this is expressed in the current blueprint or runtime model.

## Current Complex Resources — What to Keep

The existing complex resource implementation handles technical grouping (energy meter phases, bathroom dimmer) well enough for the installer/developer view. No changes needed to what works today:

- `mode: "computed"` with `ComplexComputeService` for derived values
- `mode: "primary"` / `mode: "carousel"` for UI projections
- Sub-resource grouping with section headers in the interaction panel
- Complex resources cannot have rules attached (may change in the future for computed resources, master-only)

## Immediate Cleanup: BaseResource Split

Regardless of the larger design questions, the type hierarchy cleanup is straightforward:

```
BaseResource (id, name, description, type, hidden)
├── AddressableResource (edge + device + pin)
│   └── digitalInput, digitalOutput, analogInput, analogOutput
├── TimerResource (optional edge for hosting)
│   └── timer
└── ComplexResource (no edge, no device, no pin)
    └── complex
```

### Migration

- **Blueprint** — Split `ResourceBase`, update type generics and factories
- **Runtime types** — Mirror hierarchy, `RuntimeComplexResource` drops `edge`/`device`/`pin`
- **UI** — Audit selectors/components that assume `edge` exists
- **Rule runtime** — Serialization stops emitting unused fields
- **Edge (go-uhn)** — No changes, never sees complex resources

## Open Design Questions

These need more real-world scenarios before designing solutions:

1. **How should blueprint authors express spaces/rooms?** Metadata on resources? Separate space definitions? Inferred from file structure?
2. **What is the right abstraction for "things"?** A new resource type? A UI-layer concept? A blueprint-level mapping?
3. **How does command routing work for things?** The routing depends on whether physical inputs exist and what rules are involved. Is this declarative in the blueprint or configured per-thing?
4. **Should the UI have distinct views?** Installer view (flat resource grid, technical details) vs consumer view (spaces with things). Or one adaptive view?
5. **Where do scenes fit?** Blueprint-defined presets? Runtime-created by users? Both?
6. **How do things interact with rules?** Rules currently operate on physical resources. If a thing's command simulates a button press, rules work naturally. If there's no button, the thing needs its own rule integration.

These questions will become clearer as more physical installations are running and the real pain points emerge.
