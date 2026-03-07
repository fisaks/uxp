import { alpha, Theme } from "@mui/material";
import { BaseAnalogInputKind, BaseAnalogOutputKind, BaseInputKind, BaseOutputKind } from "@uhn/blueprint";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";


type KindColors<K extends string> = {
    [keyof in K]: {
        icon: {
            active: { light: string; dark: string };
            inactive: { light: string; dark: string };
        };
        surface: {
            light: string;
            dark: string;
        };
    }

}
const outputKindColors: KindColors<BaseOutputKind> = {
    light: {
        icon: {
            active: {
                light: "#FFB300",
                dark: "#FFD54F",
            },
            inactive: {
                light: "#9E9E9E",
                dark: "#9E9E9E",
            },
        },
        surface: {
            light: "#FFB300",
            dark: "#FFD54F",
        },
    },
    indicator: {
        icon: {
            active: {
                light: "#FFC107",
                dark: "#FFE082",
            },
            inactive: {
                light: "#9E9E9E",
                dark: "#9E9E9E",
            },
        },
        surface: {
            light: "#FFC107",
            dark: "#FFE082",
        },
    },
    relay: {
        icon: {
            active: {
                light: "#546E7A",
                dark: "#78909C",
            },
            inactive: {
                light: "#757575",
                dark: "#757575",
            },
        },
        surface: {
            light: "#546E7A",
            dark: "#78909C",
        },
    },
    socket: {
        icon: {
            active: {
                light: "#00ACC1",
                dark: "#4DD0E1",
            },
            inactive: {
                light: "#757575",
                dark: "#757575",
            },
        },
        surface: {
            light: "#00ACC1",
            dark: "#4DD0E1",
        },

    },



} as const;

const timerColors = {
    icon: {
        active: { light: "#00897B", dark: "#4DB6AC" },
        inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
    },
    surface: {
        light: "#00897B",
        dark: "#4DB6AC",
    },
} as const;

const inputKindColors: KindColors<BaseInputKind> = {
    button: {
        icon: {
            active: { light: "#2196F3", dark: "#64B5F6" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#1976D2",
            dark: "#64B5F6",
        },
    },
    pir: {
        icon: {
            active: { light: "#9C27B0", dark: "#CE93D8" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#7B1FA2",
            dark: "#CE93D8",
        },
    },
    lightSensor: {
        icon: {
            active: { light: "#009688", dark: "#4DB6AC" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#00796B",
            dark: "#4DB6AC",
        },
    },
} as const;

const analogInputKindColors: KindColors<BaseAnalogInputKind> = {
    temperature: {
        icon: {
            active: { light: "#E65100", dark: "#FF9E40" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#E65100",
            dark: "#FF9E40",
        },
    },
    humidity: {
        icon: {
            active: { light: "#1E88E5", dark: "#42A5F5" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#1565C0",
            dark: "#42A5F5",
        },
    },
    power: {
        icon: {
            active: { light: "#F57C00", dark: "#FFB74D" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#EF6C00",
            dark: "#FFB74D",
        },
    },
    current: {
        icon: {
            active: { light: "#7B1FA2", dark: "#CE93D8" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#6A1B9A",
            dark: "#CE93D8",
        },
    },
} as const;

const analogOutputKindColors: KindColors<BaseAnalogOutputKind> = {
    dimmer: {
        icon: {
            active: { light: "#FFA000", dark: "#FFCA28" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#FF8F00",
            dark: "#FFCA28",
        },
    },
    valve: {
        icon: {
            active: { light: "#00838F", dark: "#26C6DA" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#006064",
            dark: "#26C6DA",
        },
    },
    pwm: {
        icon: {
            active: { light: "#6A1B9A", dark: "#AB47BC" },
            inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
        },
        surface: {
            light: "#4A148C",
            dark: "#AB47BC",
        },
    },
} as const;

const complexColors = {
    icon: {
        active: { light: "#5C6BC0", dark: "#7986CB" },
        inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
    },
    surface: {
        light: "#3F51B5",
        dark: "#7986CB",
    },
} as const;

const virtualDigitalInputColors = {
    icon: {
        active: { light: "#00897B", dark: "#4DB6AC" },
        inactive: { light: "#9E9E9E", dark: "#9E9E9E" },
    },
    surface: {
        light: "#00695C",
        dark: "#4DB6AC",
    },
} as const;

export function getResourceIconColor(
    theme: Theme,
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState

) {
    if (resource.errors?.length) return theme.palette.error.main;

    const mode = theme.palette.mode; // "light" | "dark"
    const active = Boolean(state?.value);

    if (resource.type === "timer") {
        return active ? timerColors.icon.active[mode] : timerColors.icon.inactive[mode];
    }

    if (resource.type === "digitalOutput" && resource.outputKind) {
        const cfg = outputKindColors[resource.outputKind as keyof typeof outputKindColors];
        return active ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    if (resource.type === "digitalInput" && resource.inputKind) {
        const cfg = inputKindColors[resource.inputKind as keyof typeof inputKindColors];
        return active ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    if (resource.type === "analogInput" && resource.analogInputKind) {
        const cfg = analogInputKindColors[resource.analogInputKind as keyof typeof analogInputKindColors];
        return cfg ? cfg.icon.active[mode] : theme.palette.text.primary;
    }

    if (resource.type === "analogOutput" && resource.analogOutputKind) {
        const cfg = analogOutputKindColors[resource.analogOutputKind as keyof typeof analogOutputKindColors];
        if (!cfg) return theme.palette.text.primary;
        const analogActive = typeof state?.value === "number" && state.value > (resource.min ?? 0);
        return analogActive ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    if (resource.type === "complex") {
        let complexActive: boolean;
        if (typeof state?.value === "boolean") {
            complexActive = state.value;
        } else if (typeof state?.value === "number") {
            complexActive = state.value !== (resource.inactiveValue ?? 0);
        } else {
            complexActive = false;
        }
        return complexActive ? complexColors.icon.active[mode] : complexColors.icon.inactive[mode];
    }

    if (resource.type === "virtualDigitalInput") {
        return active ? virtualDigitalInputColors.icon.active[mode] : virtualDigitalInputColors.icon.inactive[mode];
    }

    return theme.palette.text.disabled;
}

export function getResourceSurfaceColor(
    theme: Theme,
    resource: TileRuntimeResource
) {
    const mode = theme.palette.mode;

    if (resource.type === "timer") {
        return alpha(timerColors.surface[mode], mode === "dark" ? 0.06 : 0.045);
    }

    if (resource.type === "digitalOutput" && resource.outputKind) {
        const base = outputKindColors[resource.outputKind as keyof typeof outputKindColors]?.surface?.[mode];
        if (!base) return "transparent";

        return alpha(base, mode === "dark" ? 0.06 : 0.045);
    }

    if (resource.type === "digitalInput" && resource.inputKind) {
        const base = inputKindColors[resource.inputKind as keyof typeof inputKindColors]?.surface?.[mode];
        if (!base) return "transparent";

        return alpha(base, mode === "dark" ? 0.06 : 0.045);
    }

    if (resource.type === "analogInput" && resource.analogInputKind) {
        const base = analogInputKindColors[resource.analogInputKind as keyof typeof analogInputKindColors]?.surface?.[mode];
        if (!base) return "transparent";
        return alpha(base, mode === "dark" ? 0.06 : 0.045);
    }

    if (resource.type === "analogOutput" && resource.analogOutputKind) {
        const base = analogOutputKindColors[resource.analogOutputKind as keyof typeof analogOutputKindColors]?.surface?.[mode];
        if (!base) return "transparent";
        return alpha(base, mode === "dark" ? 0.06 : 0.045);
    }

    if (resource.type === "complex") {
        return alpha(complexColors.surface[mode], mode === "dark" ? 0.06 : 0.045);
    }

    if (resource.type === "virtualDigitalInput") {
        return alpha(virtualDigitalInputColors.surface[mode], mode === "dark" ? 0.06 : 0.045);
    }

    return "transparent";
}