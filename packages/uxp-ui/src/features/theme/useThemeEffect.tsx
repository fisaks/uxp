import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { UXP_THEME_EFFECT_EVENT, UXP_THEME_EFFECT_STOP_EVENT, ThemeEffectMode } from "@uxp/ui-lib";
import { selectMySetting } from "../settings/mySettingSelector";
import Snowfall from "./Snowfall";
import GodzillaStrike from "./GodzillaStrike";
import WizardSpell from "./WizardSpell";
import WitcherIgni from "./WitcherIgni";

const EFFECT_COMPONENTS: Record<string, React.FC<{ silent?: boolean }>> = {
    windsOfWinter: Snowfall,
    godzilla: GodzillaStrike,
    wizard: WizardSpell,
    witcher: WitcherIgni,
};

/**
 * Listens for UXP_THEME_EFFECT_EVENT and renders the active theme's
 * effect component. Supports "full" (with sound) and "ambient" (silent) modes.
 *
 * Dismisses via:
 * - "Stop Effect" command (UXP_THEME_EFFECT_STOP_EVENT)
 * - Escape key
 * - Double-click / double-tap anywhere
 */
export function useThemeEffect(): React.ReactNode {
    const mySettings = useSelector(selectMySetting());
    const themeKey = mySettings?.theme;
    /** Incremented on each trigger to force React to remount the effect component, restarting all animations and sounds */
    const [effectKey, setEffectKey] = useState(0);
    const [mode, setMode] = useState<ThemeEffectMode | null>(null);
    const lastTapTime = useRef(0);

    const dismiss = useCallback(() => {
        setMode(null);
    }, []);

    const handleTrigger = useCallback((e: Event) => {
        if (!themeKey || !EFFECT_COMPONENTS[themeKey]) return;
        const detail = (e as CustomEvent).detail;
        const triggerMode: ThemeEffectMode = detail?.mode ?? "full";
        setEffectKey(k => k + 1);
        setMode(triggerMode);
    }, [themeKey]);

    // Listen for trigger and stop events
    useEffect(() => {
        window.addEventListener(UXP_THEME_EFFECT_EVENT, handleTrigger);
        window.addEventListener(UXP_THEME_EFFECT_STOP_EVENT, dismiss);
        return () => {
            window.removeEventListener(UXP_THEME_EFFECT_EVENT, handleTrigger);
            window.removeEventListener(UXP_THEME_EFFECT_STOP_EVENT, dismiss);
        };
    }, [handleTrigger, dismiss]);

    // Escape key to dismiss
    useEffect(() => {
        if (!mode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, dismiss]);

    // Double-click / double-tap to dismiss
    useEffect(() => {
        if (!mode) return;
        const handleDoubleTap = () => {
            const now = Date.now();
            if (now - lastTapTime.current < 400) {
                dismiss();
            }
            lastTapTime.current = now;
        };
        window.addEventListener("pointerdown", handleDoubleTap);
        return () => window.removeEventListener("pointerdown", handleDoubleTap);
    }, [mode, dismiss]);

    if (!mode || !themeKey) return null;

    const EffectComponent = EFFECT_COMPONENTS[themeKey];
    if (!EffectComponent) return null;

    return <EffectComponent key={effectKey} silent={mode === "ambient"} />;
}
