import { BaseInputKind, BaseOutputKind } from "@uhn/blueprint";

export type ResourceVisualState = "active" | "inactive";
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
export const outputKindColors: KindColors<BaseOutputKind> = {
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

export const inputKindColors: KindColors<BaseInputKind> = {
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

