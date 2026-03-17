import { useCallback, useEffect, useRef, useState } from "react";
import { parseSpokenNumber } from "../shared/parseSpokenNumber";
import type { AnalogValueVoiceHandlers } from "./commandPalette.types";

/** Keywords that increase the value by one step. */
const INCREASE_KEYWORDS = new Set(["increase", "up", "more", "higher", "raise", "brighter", "louder", "warmer"]);
/** Keywords that decrease the value by one step. */
const DECREASE_KEYWORDS = new Set(["decrease", "down", "less", "lower", "reduce", "dimmer", "quieter", "cooler"]);
/** Keywords that jump the value to maximum. */
const MAX_KEYWORDS = new Set(["maximum", "max", "full", "highest", "brightest"]);
/** Keywords that jump the value to minimum. */
const MIN_KEYWORDS = new Set(["minimum", "min", "zero", "lowest"]);
/** Keywords that turn on (set to default or max). */
const ON_KEYWORDS = new Set(["on"]);
/** Keywords that turn off (set to min). */
const OFF_KEYWORDS = new Set(["off"]);
/** Keywords that set to the default on value. */
const DEFAULT_KEYWORDS = new Set(["default", "normal", "standard"]);
/** Keywords that close the analog dialog. */
const CLOSE_KEYWORDS = new Set([
    "close", "done", "finish", "finished", "okay", "ok", "stop", "enough", "that's",
    "confirm", "cancel", "abort", "dismiss", "exit", "quit", "back", "nevermind", "never",
    "yes", "no", "nope", "nah",
]);

/** Auto-clear transcript after this many milliseconds. */
const TRANSCRIPT_CLEAR_MS = 3000;

type UseAnalogVoiceControlOptions = {
    /** Whether voice control is active (popup open + voice was enabled). */
    voiceActive: boolean;
    /** Current slider value (read via ref to avoid stale closures). */
    localValue: number;
    min: number;
    max: number;
    step: number;
    bigStep: number;
    /** Default "on" value from the blueprint. Falls back to max when undefined. */
    defaultOnValue?: number;
    /** Send an exact value to the device. */
    sendExact: (value: number) => void;
    /** Close the analog popup. */
    onClose: () => void;
    /** Ref that this hook populates with its handlers while active. The parent voice flow reads this ref to redirect recognition results here. */
    analogValueVoiceControlRef: React.MutableRefObject<AnalogValueVoiceHandlers | null>;
};

type UseAnalogVoiceControlReturn = {
    /** The last transcript received from speech recognition (interim or final). */
    lastTranscript: string;
};

/**
 * Adds voice control to the analog slider popup.
 * Does NOT own a SpeechRecognition instance — instead, registers handlers in
 * `analogValueVoiceControlRef` so the parent voice flow can redirect recognition results here.
 */
export function useAnalogValueVoiceControl({
    voiceActive,
    localValue,
    min,
    max,
    step,
    bigStep,
    defaultOnValue,
    sendExact,
    onClose,
    analogValueVoiceControlRef,
}: UseAnalogVoiceControlOptions): UseAnalogVoiceControlReturn {
    const localValueRef = useRef(localValue);
    localValueRef.current = localValue;
    const sendExactRef = useRef(sendExact);
    sendExactRef.current = sendExact;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const stepRef = useRef(step);
    stepRef.current = step;
    const bigStepRef = useRef(bigStep);
    bigStepRef.current = bigStep;
    const minRef = useRef(min);
    minRef.current = min;
    const maxRef = useRef(max);
    maxRef.current = max;
    const defaultOnValueRef = useRef(defaultOnValue);
    defaultOnValueRef.current = defaultOnValue;

    const [lastTranscript, setLastTranscript] = useState("");
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Set transcript and schedule auto-clear. */
    const setTranscriptWithAutoClear = useCallback((text: string) => {
        setLastTranscript(text);
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        if (text) {
            clearTimerRef.current = setTimeout(() => setLastTranscript(""), TRANSCRIPT_CLEAR_MS);
        }
    }, []);

    const handleResult = useCallback((transcript: string, alternatives?: string[]) => {
        const trimmed = transcript.trim();
        setTranscriptWithAutoClear(trimmed);
        if (!trimmed) return;

        const trimmedLower = trimmed.toLowerCase();

        // Collect words from the top transcript AND all alternatives so that
        // short ambiguous words (e.g. "less" misheard as "yes") are still found
        // if they appear in a lower-ranked hypothesis.
        const allTexts = [trimmedLower, ...(alternatives ?? []).map(a => a.trim().toLowerCase())];
        const allWords = allTexts.flatMap(t => t.split(/\s+/));

        // Try to extract a number from the utterance (top transcript only —
        // alternatives might contain spurious digits)
        const number = parseSpokenNumber(trimmedLower);
        if (number != null) {
            sendExactRef.current(number);
            return;
        }

        // Check for close keywords
        if (allWords.some(w => CLOSE_KEYWORDS.has(w))) {
            onCloseRef.current();
            return;
        }

        // Check for "much more" / "much less" (big step) — look for amplifier + direction
        const hasBigAmplifier = allWords.some(w => w === "much" || w === "way" || w === "lot" || w === "big");

        // Check for max/min keywords
        if (allWords.some(w => MAX_KEYWORDS.has(w))) {
            sendExactRef.current(maxRef.current);
            return;
        }
        if (allWords.some(w => MIN_KEYWORDS.has(w))) {
            sendExactRef.current(minRef.current);
            return;
        }

        // Check for on/off/default — "on", "turn on", "set on", "set default", etc.
        if (allWords.some(w => ON_KEYWORDS.has(w))) {
            sendExactRef.current(defaultOnValueRef.current ?? maxRef.current);
            return;
        }
        if (allWords.some(w => OFF_KEYWORDS.has(w))) {
            sendExactRef.current(minRef.current);
            return;
        }
        if (allWords.some(w => DEFAULT_KEYWORDS.has(w))) {
            sendExactRef.current(defaultOnValueRef.current ?? maxRef.current);
            return;
        }

        // Check for increase/decrease
        if (allWords.some(w => INCREASE_KEYWORDS.has(w))) {
            const delta = hasBigAmplifier ? bigStepRef.current : stepRef.current;
            sendExactRef.current(localValueRef.current + delta);
            return;
        }
        if (allWords.some(w => DECREASE_KEYWORDS.has(w))) {
            const delta = hasBigAmplifier ? bigStepRef.current : stepRef.current;
            sendExactRef.current(localValueRef.current - delta);
            return;
        }

        // Unrecognized — ignore
    }, [setTranscriptWithAutoClear]);

    const handleInterim = useCallback((transcript: string) => {
        setTranscriptWithAutoClear(transcript.trim());
    }, [setTranscriptWithAutoClear]);

    // Register/unregister handlers in the ref while voice is active.
    useEffect(() => {
        if (!voiceActive) {
            analogValueVoiceControlRef.current = null;
            return;
        }
        analogValueVoiceControlRef.current = { handleResult, handleInterim };
        return () => {
            analogValueVoiceControlRef.current = null;
        };
    }, [voiceActive, handleResult, handleInterim, analogValueVoiceControlRef]);

    // Cleanup auto-clear timer on unmount
    useEffect(() => {
        return () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        };
    }, []);

    return { lastTranscript };
}

