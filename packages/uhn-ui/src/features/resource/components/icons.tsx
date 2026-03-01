// icons.tsx
import BoltIcon from "@mui/icons-material/Bolt";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import FluorescentIcon from '@mui/icons-material/Fluorescent';
import FluorescentOutlinedIcon from '@mui/icons-material/FluorescentOutlined';
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import OpacityIcon from "@mui/icons-material/Opacity";
import PowerIcon from "@mui/icons-material/Power";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import SensorsIcon from "@mui/icons-material/Sensors";
import SpeedIcon from "@mui/icons-material/Speed";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import TuneIcon from "@mui/icons-material/Tune";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WbSunnyIcon from "@mui/icons-material/WbSunny";


import TimerIcon from "@mui/icons-material/Timer";
import TimerOffIcon from "@mui/icons-material/TimerOff";

import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

import PowerOutlinedIcon from "@mui/icons-material/PowerOutlined";



import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import { BaseAnalogInputKind, BaseAnalogOutputKind, BaseInputKind, BaseOutputKind, InputType } from "@uhn/blueprint";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { ReedRelayClosedIcon, ReedRelayOpenIcon } from "./relay-icon";



/* ------------------------------------------------------------------ */
/* Output icons                                                       */
/* ------------------------------------------------------------------ */
type OutputKindIcons = {
  [key in BaseOutputKind]: ActiveInactiveIcons
}
type InputKindIcons = {
  [K in BaseInputKind]: InputKindIconShape<K>;
}

type ActiveInactiveIcons = {
  active: JSX.Element;
  inactive: JSX.Element;
};
type ButtonIcons = {
  [K in InputType]: ActiveInactiveIcons;
};
type InputKindIconShape<K extends BaseInputKind> =
  K extends "button"
  ? ButtonIcons
  : ActiveInactiveIcons;

const outputKindIcons: OutputKindIcons = {
  relay: {
    active: <ReedRelayClosedIcon />,
    inactive: <ReedRelayOpenIcon />,
  },

  socket: {
    active: <PowerIcon />,
    inactive: <PowerOutlinedIcon />,
  },

  light: {
    active: <LightbulbIcon />,
    inactive: <LightbulbOutlinedIcon />,
  },

  indicator: {
    active: <FluorescentIcon />,
    inactive: <FluorescentOutlinedIcon />,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Input icons                                                        */
/* ------------------------------------------------------------------ */

const inputKindIcons: InputKindIcons = {
  button: {
    push: {
      active: <RadioButtonCheckedIcon />,
      inactive: <RadioButtonCheckedIcon />,
    },
    toggle: {
      active: <ToggleOnIcon />,
      inactive: <ToggleOffIcon />,
    },
  },

  pir: {
    active: <SensorsIcon />,
    inactive: <SensorsOutlinedIcon />,
  },

  lightSensor: {
    // semantic choice: sun when active, moon when inactive
    active: <DarkModeIcon />,
    inactive: <WbSunnyIcon />,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Analog icons                                                       */
/* ------------------------------------------------------------------ */

const analogInputKindIcons: Record<BaseAnalogInputKind, JSX.Element> = {
  temperature: <ThermostatIcon />,
  humidity: <WaterDropIcon />,
  power: <BoltIcon />,
};

const analogOutputKindIcons: Record<BaseAnalogOutputKind, JSX.Element> = {
  dimmer: <TuneIcon />,
  valve: <OpacityIcon />,
  pwm: <SpeedIcon />,
};

const fallbackIcon = <DeviceHubIcon />;

export function getResourceIcon(
  resource: TileRuntimeResource,
  state?: TileRuntimeResourceState
) {
  const active = Boolean(state?.value);

  // -------------------------
  // Outputs
  // -------------------------
  if (resource.type === "digitalOutput") {
    const kind = resource.outputKind;
    if (!kind) return fallbackIcon;

    const entry =
      outputKindIcons[kind as keyof typeof outputKindIcons];

    if (!entry) return fallbackIcon;

    return active ? entry.active : entry.inactive;
  }

  // -------------------------
  // Timers
  // -------------------------
  if (resource.type === "timer") {
    return active ? <TimerIcon /> : <TimerOffIcon />;
  }

  // -------------------------
  // Analog Inputs
  // -------------------------
  if (resource.type === "analogInput") {
    const kind = resource.analogInputKind;
    if (!kind) return fallbackIcon;
    return analogInputKindIcons[kind as keyof typeof analogInputKindIcons] ?? fallbackIcon;
  }

  // -------------------------
  // Analog Outputs
  // -------------------------
  if (resource.type === "analogOutput") {
    const kind = resource.analogOutputKind;
    if (!kind) return fallbackIcon;
    return analogOutputKindIcons[kind as keyof typeof analogOutputKindIcons] ?? fallbackIcon;
  }

  // -------------------------
  // Inputs
  // -------------------------
  if (resource.type === "digitalInput") {
    const kind = resource.inputKind;
    if (!kind) return fallbackIcon;

    if (kind === "button") {
      const inputType = resource.inputType ?? "push";
      return (
        inputKindIcons.button[inputType]?.[
        active ? "active" : "inactive"
        ] ?? fallbackIcon
      );
    }

    const entry =
      inputKindIcons[kind as keyof typeof inputKindIcons] as { active: JSX.Element, inactive: JSX.Element } | undefined;

    if (!entry) return fallbackIcon;

    return entry[active ? "active" : "inactive"];
  }

  return fallbackIcon;
}