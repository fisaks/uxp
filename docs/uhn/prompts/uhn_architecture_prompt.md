
# UHN Architecture Prompt (v4)

This document describes the architectural model for UHN and the relationships between:

- Resources
- Rules
- InteractionViews
- Scenes
- Locations

The architecture is designed around a single core principle:

**There must only be one path that controls system behavior.**

Automation logic must always flow through the rule system.

---

# 1. Resource Model

Resources represent **runtime primitives of the system**.  
They are the only entities that participate directly in rules.

## BaseResource

Shared metadata:

- id
- name
- description
- type
- hidden

## PhysicalResource

Represents hardware-backed resources.

Fields:

- edge
- device
- pin

Types:

- digitalInput
- digitalOutput
- analogInput
- analogOutput

These correspond directly to physical hardware.

Examples:

- wall button
- relay
- dimmer channel
- sensor input

## LogicalResource

Represents software-based resources.

Fields:

- host: "master" | edgeId

Types:

- timer
- complex

Logical resources exist purely in software.

Examples:

- timers
- computed values
- aggregated measurements

---

# 2. Rules

Rules represent **automation logic**.

Rules operate strictly on **resources**.

Rules may reference:

- PhysicalResource
- LogicalResource

Rules must **never reference InteractionViews or Scenes**.

Rules should model **real-world system behavior**.

Examples:

button press → toggle relay  
sensor change → trigger action  
timer expiration → perform task

Rules define how the **system reacts to signals and state changes**.

---

# 3. InteractionViews

InteractionViews represent **human-facing objects ("things")**.

Examples:

- Ceiling Light
- Kitchen Sockets
- Dimmer
- Sauna Heater
- Garage Door

InteractionViews are **not resources**.

They exist purely in the **interaction layer (UI / API)**.

InteractionViews solve these problems:

| Problem                   | Example                   |
| ------------------------- | ------------------------- |
| Physical complexity       | light with button + relay |
| Hardware limitations      | long press actions        |
| Multi-device grouping     | sockets                   |
| State aggregation         | room lights               |
| Better UI controls        | dimmer slider             |
| Missing physical controls | "All lights"              |
| Human concepts            | heating                   |
| UI-only interactions      | alarm panel               |


### Key Properties

InteractionViews:

- do not own state
- do not participate in rules
- do not replace resources
- do not contain automation logic

Instead they **simulate real-world interaction**.

Examples:

tap tile → simulate button press  
slider → set analog output

The rule system then reacts exactly as if the physical device had been used.

### Purpose

InteractionViews:

- abstract physical implementation
- map human concepts to multiple resources
- remove hardware interaction limitations
- provide a consistent UI model

They act as a **virtual finger interacting with the real system**.

---

# 4. Scenes

Scenes represent **system state presets**.

A scene coordinates **multiple resource actions**.

Scenes represent reusable system state presets.

Scenes execute actions on resources.

Scenes may be triggered by:
- Rules
- API calls from a scene tile in ui

InteractionViews typically trigger scenes indirectly by
simulating resource signals that activate rules.

Example:

Scene: Movie Night

- dim living room lights
- close curtains
- turn on TV
- enable ambient lighting

Scenes:

- operate directly on resources
- represent a system situation
- are executed immediately when activated

Scenes are **not devices**.

They represent **moments or configurations of the system**.

---

# 5. Locations

Locations represent **human spatial grouping**.

Examples:

- Kitchen
- Bathroom
- Garage
- Upstairs

Locations are used for **UI organization**.

Locations **do not own objects**. They reference them.

A location may contain:

- Resources
- InteractionViews
- Scenes

Example:

Kitchen

- Ceiling Light (InteractionView)
- Kitchen Relay (Resource)
- Kitchen Button (Resource)
- Cooking Scene

Locations are simply **collections of references**.

Objects may appear in **multiple locations**.

---

# 6. Blueprint Responsibility

The blueprint author fully defines what appears in locations.

There is **no automatic hiding or inference**.

Example:

Kitchen
 ├ Ceiling Light (InteractionView)
 ├ Kitchen Relay (Resource)
 ├ Kitchen Button (Resource)
 └ Cooking Scene

Locations may contain:

- only InteractionViews
- only resources
- only scenes
- any mixture of these

This ensures deterministic behavior.

---

# 7. Complex Resources

Complex resources remain a type of LogicalResource.

Represents derived runtime values.

Example:

total energy = sum of phases


---

# 8. System Control Path

All system behavior must flow through the same path.

Valid triggers:

- physical button
- UI interaction
- voice command
- API call

All become:

emitSignal(resource)

Then:

resource → rule → resource

This ensures:

- UI never bypasses rules
- behavior is consistent
- automation logic lives only in rules

InteractionViews therefore **simulate physical interaction instead of bypassing it**.

---

# 9. Mental Model

A helpful way to understand the architecture:

| Concept | Represents |
|-------|-------------|
| Resource | real system primitive |
| InteractionView | a human-facing object |
| Scene | a system situation |
| Rule | automation logic |
| Location | spatial grouping |

Examples:

Resource → relay  
InteractionView → ceiling light  
Scene → movie night  
Rule → button toggles light  
Location → kitchen

---

# 10. Final Architecture Model

BaseResource
 ├ PhysicalResource
 │  ├ digitalInput
 │  ├ digitalOutput
 │  ├ analogInput
 │  └ analogOutput
 │
 └ LogicalResource
    ├ timer
    └ complex

InteractionView (interaction abstraction)

Scene
 └ actions on resources

Location
 └ entries
    ├ resourceRef
    ├ interactionViewRef
    └ sceneRef

Rules
 └ operate only on resources

---

# 11. Design Principles

1. Automation logic belongs in Rules.
2. Resources represent the real system.
3. InteractionViews simulate human interaction.
4. Scenes represent system state presets.
5. Locations group objects for the UI.
6. Blueprint authors define UI structure explicitly.
7. The UI must never bypass the rule system.
