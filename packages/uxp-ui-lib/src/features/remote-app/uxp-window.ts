// packages/uxp-common/src/uxp-window.ts
import type { Theme } from "@mui/material";
import { HealthSnapshot, UserPublic } from "@uxp/common";


export type UxpWindowApi = {
    theme?: Theme;
    defaultTheme: string;
    updateTheme: (mode: Theme) => void;
    getUser: () => UserPublic | undefined;
    signal: {
        health: (snapshot: HealthSnapshot) => void;
    };
    navigation: {
        updateRemoteSubRoute: (rootpath: string, subRoute: string) => void;
        requestBaseNavigation: (type: "route" | "hash", identifier: string, subRoute?: string) => void;
    };
};

export function getUxpWindow(): UxpWindowApi | undefined {
    // We trust the UXP runtime to provide this shape.
    // The browser contract itself remains defensive.
    return window.uxp as UxpWindowApi | undefined;
}