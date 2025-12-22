// icons.tsx
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import LightbulbTwoTone from "@mui/icons-material/LightbulbTwoTone";
import PowerIcon from "@mui/icons-material/Power";
import PowerSocketIcon from "@mui/icons-material/Power";
import CircleIcon from "@mui/icons-material/Circle";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import SensorsIcon from "@mui/icons-material/Sensors";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";

const outputKindIcons = {
  relay: <PowerIcon />,
  socket: <PowerSocketIcon />,
  light: <LightbulbIcon />,
  indicator: <LightbulbTwoTone />,
};
const inputKindIcons = {
  button: <RadioButtonCheckedIcon />,
  pir: <SensorsIcon />,
  lightSensor: <VisibilityIcon />,
};
const fallbackIcon = <DeviceHubIcon />;

export function getOutputIcon(kind?: string) {
    if (!kind) return fallbackIcon;
    return outputKindIcons[kind as keyof typeof outputKindIcons] ?? fallbackIcon;
}

export function getInputIcon(kind?: string) {
    if (!kind) return fallbackIcon;
    return inputKindIcons[kind as keyof typeof inputKindIcons] ?? fallbackIcon;
}
