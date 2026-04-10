import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { UXP_THEME_EFFECT_TRIGGER, UXP_THEME_EFFECT_STOP, THEME_EFFECTS, ThemeEffectMode } from "@uxp/ui-lib";
import { selectMySetting } from "../settings/mySettingSelector";
import DraculaEffect from "./DraculaEffect";
import Snowfall from "./Snowfall";
import GodzillaStrike from "./GodzillaStrike";
import WizardSpell from "./WizardSpell";
import WitcherIgni from "./WitcherIgni";
import DarkSideEffect from "./DarkSideEffect";
import RebelAllianceEffect from "./RebelAllianceEffect";
import SunsetEffect from "./SunsetEffect";
import TatooineEffect from "./TatooineEffect";

export const EFFECT_COMPONENTS: Record<string, React.FC<{ silent?: boolean }>> = {
    dracula: DraculaEffect,
    starWarsDarkSide: DarkSideEffect,
    rebelAlliance: RebelAllianceEffect,
    sunset: SunsetEffect,
    tatooine: TatooineEffect,
    windsOfWinter: Snowfall,
    godzilla: GodzillaStrike,
    wizard: WizardSpell,
    witcher: WitcherIgni,
};

/**
 * Manages theme effects — both manual (command palette) and auto-triggered.
 *
 * Manual triggers loop until dismissed via Escape, double-click/tap, or "Stop Effect".
 * Auto-triggers run for the configured duration then auto-dismiss.
 * Both can be dismissed the same way (Escape, double-click/tap, "Stop Effect").
 * Auto-triggers only fire when the tab is visible.
 */
export function useThemeEffect(): React.ReactNode {
    const mySettings = useSelector(selectMySetting());
    const themeKey = mySettings?.theme;
    const themeEffectSettings = mySettings?.themeEffect;

    /** Incremented on each trigger to force React to remount the effect component, restarting all animations and sounds */
    const [effectKey, setEffectKey] = useState(0);
    const [mode, setMode] = useState<ThemeEffectMode | null>(null);
    /** Tracks whether the current effect was triggered manually or by the auto-timer */
    const triggerSourceRef = useRef<"manual" | "auto" | null>(null);
    const lastTapTime = useRef(0);

    const dismiss = useCallback(() => {
        setMode(null);
        triggerSourceRef.current = null;
    }, []);

    // ── Manual trigger (command palette / window event) ──
    const handleTrigger = useCallback((e: Event) => {
        if (!themeKey || !EFFECT_COMPONENTS[themeKey]) return;
        const detail = (e as CustomEvent).detail;
        const triggerMode: ThemeEffectMode = detail?.mode ?? "full";
        triggerSourceRef.current = "manual";
        setEffectKey(k => k + 1);
        setMode(triggerMode);
    }, [themeKey]);

    // Listen for trigger and stop events
    useEffect(() => {
        window.addEventListener(UXP_THEME_EFFECT_TRIGGER, handleTrigger);
        window.addEventListener(UXP_THEME_EFFECT_STOP, dismiss);
        return () => {
            window.removeEventListener(UXP_THEME_EFFECT_TRIGGER, handleTrigger);
            window.removeEventListener(UXP_THEME_EFFECT_STOP, dismiss);
        };
    }, [handleTrigger, dismiss]);

    // ── Auto-stop for auto-triggered effects (custom duration or default one-cycle) ──
    useEffect(() => {
        if (!mode || triggerSourceRef.current !== "auto" || !themeKey) return;
        const meta = THEME_EFFECTS[themeKey];
        // No effect metadata for this theme — skip auto-stop, dismiss manually
        if (!meta) return;
        // Use custom duration if set (seconds → ms), otherwise default to one cycle
        const durationMs = themeEffectSettings?.duration
            ? themeEffectSettings.duration * 1000
            : meta.durationMs;
        const timer = setTimeout(dismiss, durationMs);
        return () => clearTimeout(timer);
    }, [mode, effectKey, themeKey, themeEffectSettings?.duration, dismiss]);

    // ── Auto-trigger scheduling ──
    useEffect(() => {
        if (!themeEffectSettings?.autoTrigger || !themeKey || !EFFECT_COMPONENTS[themeKey]) return;

        const { frequency, mode: effectMode, duration: customDuration } = themeEffectSettings;
        const baseIntervalMs = frequency * 60_000;
        const meta = THEME_EFFECTS[themeKey];
        const effectDurationMs = customDuration ? customDuration * 1000 : (meta?.durationMs ?? 0);
        let timer: ReturnType<typeof setTimeout>;
        let visCleanup: (() => void) | undefined;

        let hasPlayedOnce = false;
        function scheduleNext() {
            // Randomize: 0.5x to 1.5x base interval. After first trigger, also account for effect runtime.
            const delay = (hasPlayedOnce ? effectDurationMs : 0) + baseIntervalMs * (0.5 + Math.random());

            timer = setTimeout(() => {
                // Only fire on visible tab
                if (document.visibilityState !== "visible") {
                    const onVisible = () => {
                        if (document.visibilityState === "visible") {
                            document.removeEventListener("visibilitychange", onVisible);
                            visCleanup = undefined;
                            scheduleNext();
                        }
                    };
                    document.addEventListener("visibilitychange", onVisible);
                    visCleanup = () => document.removeEventListener("visibilitychange", onVisible);
                    return;
                }

                // Skip if an effect is already playing (don't interrupt manual triggers)
                if (triggerSourceRef.current) {
                    scheduleNext();
                    return;
                }

                // Fire the effect
                triggerSourceRef.current = "auto";
                hasPlayedOnce = true;
                setEffectKey(k => k + 1);
                setMode(effectMode);

                // Schedule next after this effect completes
                scheduleNext();
            }, delay);
        }

        scheduleNext();

        return () => {
            clearTimeout(timer);
            visCleanup?.();
        };
    }, [themeEffectSettings?.autoTrigger, themeEffectSettings?.frequency, themeEffectSettings?.mode, themeKey]);

    // ── Escape key to dismiss ──
    useEffect(() => {
        if (!mode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, dismiss]);

    // ── Double-click / double-tap to dismiss ──
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

    // ── Render ──
    if (!mode || !themeKey) return null;

    const EffectComponent = EFFECT_COMPONENTS[themeKey];
    if (!EffectComponent) return null;

    return <EffectComponent key={effectKey} silent={mode === "silent"} />;
}
