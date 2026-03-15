// Scene types and factory
// scene.ts

import type { BlueprintIcon } from "./icon";
import type {
    AnalogOutputResourceBase,
    DigitalInputResourceBase,
    DigitalOutputResourceBase,
    VirtualAnalogOutputResourceBase,
    VirtualDigitalInputResourceBase,
} from "./resource";

/* ------------------------------------------------------------------ */
/* Scene Action — the subset of RuleAction that scenes can contain     */
/* ------------------------------------------------------------------ */

/** Actions that a scene can execute. Identical to the base RuleAction
 *  variants but defined separately to prevent circular imports and
 *  to exclude `activateScene` (no recursive scene activation). */
export type SceneAction =
    | { type: "setDigitalOutput"; resource: DigitalOutputResourceBase; value: boolean }
    | { type: "setAnalogOutput"; resource: AnalogOutputResourceBase | VirtualAnalogOutputResourceBase; value: number }
    | { type: "emitSignal"; resource: DigitalInputResourceBase | VirtualDigitalInputResourceBase; value: boolean | undefined };

/* ------------------------------------------------------------------ */
/* Blueprint Scene                                                     */
/* ------------------------------------------------------------------ */

export type BlueprintScene = {
    id?: string;
    name?: string;
    description?: string;
    /** Alternative search terms (e.g. ["movie mode", "cinema"] for a scene). */
    keywords?: string[];
    icon?: BlueprintIcon;
    commands: SceneAction[];
};

export const isBlueprintScene = (obj: unknown): obj is BlueprintScene => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "commands" in obj &&
        Array.isArray(obj.commands)
    );
};

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export function scene(props: BlueprintScene): BlueprintScene {
    return {
        ...props,
        icon: props.icon ?? "scene:default",
    };
}
