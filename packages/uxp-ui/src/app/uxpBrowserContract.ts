// uxpBrowserContract.ts
import {
    UXP_NAVIGATION_EVENT,
    UXP_THEME_CHANGE_EVENT,
    UxpNavigationEvent
} from "@uxp/ui-lib";

import { assertNever, HealthSnapshot } from "@uxp/common";
import { healthSnapshotReceived } from "../features/header/healthSlice";
import store from "./uxp.store";


/* ============================================================================
 *  UXP → Remote : Theme
 * ========================================================================== */

// Defaults (owned by contract, not hooks)
//window.uxp.defaultTheme = "dracula";

const updateTheme = (theme: unknown) => {
    window.uxp!.theme = theme;

    window.dispatchEvent(
        new CustomEvent(UXP_THEME_CHANGE_EVENT, {
            detail: theme,
        })
    );
};

const updateRemoteSubRoute = (rootPath: string, subRoute: string) => {
    console.log("Notifying UXP host of navigation");
    window.dispatchEvent(
        new CustomEvent(UXP_NAVIGATION_EVENT, {
            detail: {
                rootPath,
                subRoute
            }
        }) satisfies UxpNavigationEvent
    );
};

/* ============================================================================
 *  UXP → Remote : User
 * ========================================================================== */

const getUser = () => {
    return store.getState().user.user;
};

/* ============================================================================
 *  Remote → UXP : Signals
 * ========================================================================== */

export const UXP_REMOTE_SIGNAL_EVENT = "uxpRemoteSignal";

type UxpRemoteSignalType = "health:snapshot";
type UxpRemoteSignal<T = unknown> = {
    appId: string;
    type: UxpRemoteSignalType;
    payload: T;
};
const emitRemoteSignal = <T,>(signal: UxpRemoteSignal<T>) => {
    window.dispatchEvent(
        new CustomEvent(UXP_REMOTE_SIGNAL_EVENT, { detail: signal })
    );
};

window.addEventListener(UXP_REMOTE_SIGNAL_EVENT, (event: Event) => {
    const { detail } = event as CustomEvent<UxpRemoteSignal>;

    switch (detail.type) {
        case "health:snapshot": {
            if (!isHealthSnapshot(detail.payload)) {
                console.warn("[UXP] Invalid health snapshot signal:", detail);
                return;
            }
            store.dispatch(
                healthSnapshotReceived(detail.payload)
            );
            break;

        }

        default:
            assertNever(detail.type);
    }
});
const isHealthSnapshot = (value: unknown): value is HealthSnapshot => {
    if (typeof value !== "object" || value === null) return false;

    const v = value as any;

    return (
        typeof v.appId === "string" &&
        Array.isArray(v.items) &&
        typeof v.updatedAt === "string"
    );
};

const healthSignal = (snapshot: unknown) => {
    if (!isHealthSnapshot(snapshot)) {
        console.warn("[UXP] Invalid health snapshot signal:", snapshot);
        return;
    }
    emitRemoteSignal({
        appId: snapshot.appId,
        type: "health:snapshot",
        payload: snapshot,
    });
}

export const noopRequestBaseNavigation = () => {
    console.warn("[UXP] requestBaseNavigation called before bridge mounted");
};


/* ============================================================================
 *  Global UXP Browser Contract
 * ========================================================================== */
// Ensure window.uxp exists
if (!window.uxp) {
    window.uxp = {
        defaultTheme: "dracula",
        getUser,
        updateTheme,
        signal: {
            health: healthSignal
        },
        navigation: {
            // Empty stub UxpRemoteNavigation will overwrite this
            requestBaseNavigation: noopRequestBaseNavigation,
            updateRemoteSubRoute
        }
    };
}

