# @uhn/blueprint-tools

CLI tools for UHN blueprint projects. Currently provides Zigbee2MQTT device import.

## Installation

Add as a dev dependency to your blueprint project:

```bash
pnpm add -D @uhn/blueprint-tools
```

Or link locally during development:

```json
"devDependencies": {
    "@uhn/blueprint-tools": "link:../uxp/packages/uhn-blueprint-tools/"
}
```

## Commands

### `z2m-import`

Imports Zigbee2MQTT devices as blueprint resources and views.

Connects to MQTT, reads `bridge/devices`, maps Z2M exposes to UHN resource types, and generates TypeScript files.

```bash
npx uhn-blueprint-tools z2m-import [options]
```

**Options:**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--mqtt-url` | `-m` | `tcp://localhost:1883` | MQTT broker URL |
| `--base-topic` | `-t` | `zigbee2mqtt` | Z2M base topic |
| `--edge` | `-e` | `edge1` | Edge name for resources |
| `--output-dir` | `-o` | `src` | Output directory for generated files |
| `--force` | `-f` | | Regenerate files for devices with missing files in import history |
| `--export` | `-x` | | Auto-export all generated resource consts |

**Generated files:**

| Output | Description |
|--------|-------------|
| `src/factory/zigbee-factory-{edge}.ts` | Type-safe factory with device unions (always regenerated) |
| `src/resources/{device}-zigbee.ts` | Resource consts (not exported by default — add `export` to activate) |
| `src/views/{device}-zigbee.ts` | Auto-wired views (exported) |
| `.z2m-data/{device}.json` | Raw Z2M device JSON (for reference, gitignored) |
| `.z2m-data/edge-config-{edge}.json` | Edge config snippet |
| `.z2m-data/import-history.json` | Tracks which devices have been imported |
| `.z2m-data/factory-mapping.json` | Configurable factory function mapping |

**Re-run safe** — existing resource and view files are never overwritten. Import history tracks previously imported devices.

### Factory Mapping

On first run, `.z2m-data/factory-mapping.json` is generated with default mappings to the zigbee factory. You can edit this to redirect resource generation to your project's own factories:

```json
{
    "analogInput.temperature": {
        "factory": "analogTemperatureSensor",
        "import": "../factory/factory"
    },
    "digitalOutput.light": {
        "factory": "outputLight",
        "import": "../factory/factory"
    }
}
```

This way, all temperature sensors use your project's `analogTemperatureSensor` from `factory.ts` instead of the generated `zigbeeTemperatureSensor`. Re-runs preserve your edits — only new kinds are added with defaults.

To use project factories with zigbee devices, add the zigbee device type unions to your project factory:

```typescript
import type { ZigbeeDigitalOutputDeviceEdge1, ZigbeeAnalogInputDeviceEdge1 } from "./zigbee-factory-edge1";

export type OutputDevice = "kitchen_io8_1" | ... | ZigbeeDigitalOutputDeviceEdge1;
export type AnalogInputDevice = "sauna_temp_1" | ... | ZigbeeAnalogInputDeviceEdge1;
```

### What gets mapped

| Z2M Expose | UHN Resource Type | Example |
|------------|-------------------|---------|
| binary (writable) | digitalOutput | switch state |
| binary (read-only) | digitalInput | occupancy sensor |
| numeric (writable) | analogOutput | brightness, color temp |
| numeric (read-only) | analogInput | temperature, power |
| enum ON/OFF (writable) | digitalOutput | smart plug state |
| enum read-only, property `"action"` | actionInput | button press, remote control |

### What gets skipped

- Write-only properties (`access === 2`) — device config
- Config-category properties — calibration, comfort thresholds
- Config composites — `level_config`, `color_options`
- Internal Z2M properties — `linkquality`, `identify`, `update`, `last_seen`
- Startup properties — `*_startup`

### Smart features

- Infers `outputKind` from device description and properties (light/socket/relay)
- Infers `analogInputKind` from property name and unit
- Suggests `decimalPrecision` based on unit (W/V → 0, A → 2, °C/% → 1)
- Generates commented preset options for properties with Z2M presets
- Handles non-TS characters in device names
- Auto-detects primary state for view wiring (writable binary → toggle command)
- Per-edge factory with typed device unions and edge const
- Generates per-device action union type and expanded per-action metadata map for `actionInput` resources (in resource file, author-editable)
- `actionInput` resources use `actionInput()` from `@uhn/blueprint` directly (no generated factory wrapper — overridable via factory mapping)

**Example usage in a blueprint project:**

```json
{
    "scripts": {
        "z2m-import": "uhn-blueprint-tools z2m-import"
    }
}
```

```bash
pnpm z2m-import                        # real Z2M
pnpm z2m-import -- -t zigbee2mqtt-sim  # simulator
pnpm z2m-import -- -x                  # auto-export resources
pnpm z2m-import -- -f                  # force regenerate missing files
```
