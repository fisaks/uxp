import { alpha, Theme } from "@mui/material";
import { BaseInputKind, BaseOutputKind } from "@uhn/blueprint";
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



export function getResourceIconColor(
    theme: Theme,
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState

) {
    if (resource.errors?.length) return theme.palette.error.main;

    const mode = theme.palette.mode; // "light" | "dark"
    const active = Boolean(state?.value);

    if (resource.type === "digitalOutput" && resource.outputKind) {
        const cfg = outputKindColors[resource.outputKind as keyof typeof outputKindColors];
        return active ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    if (resource.type === "digitalInput" && resource.inputKind) {
        const cfg = inputKindColors[resource.inputKind as keyof typeof inputKindColors];
        return active ? cfg.icon.active[mode] : cfg.icon.inactive[mode];
    }

    return theme.palette.text.disabled;
}

export function getResourceSurfaceColor(
    theme: Theme,
    resource: TileRuntimeResource
) {
    const mode = theme.palette.mode;

    if (resource.type === "digitalOutput" && resource.outputKind) {
        const base = outputKindColors[resource.outputKind as keyof typeof outputKindColors]?.surface?.[mode];
        if (!base) return "transparent";

        return alpha(base, mode === "dark" ? 0.1 : 0.045);
    }

    if (resource.type === "digitalInput" && resource.inputKind) {
        const base = inputKindColors[resource.inputKind as keyof typeof inputKindColors]?.surface?.[mode];
        if (!base) return "transparent";

        return alpha(base, mode === "dark" ? 0.1 : 0.045);
    }

    return "transparent";
}