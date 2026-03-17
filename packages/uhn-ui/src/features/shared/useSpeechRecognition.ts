/* global webkitSpeechRecognition */

/** Augment the Window interface with the vendor-prefixed Speech API. */
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
    new (): SpeechRecognitionInstance;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecognitionOptions = {
    /** Called with the final recognized transcript when recognition completes.
     *  The second parameter contains alternative transcripts (if `maxAlternatives > 1`). */
    onResult: (transcript: string, alternatives?: string[]) => void;
    /** Called with partial transcript while the user is still speaking. */
    onInterimResult?: (transcript: string) => void;
    /** BCP 47 language tag (e.g. "en-US"). Defaults to "en" since all voice
     *  commands, keywords, and spoken number parsing are English-only. */
    lang?: string;
    /** Number of alternative transcripts to request (1-10). Defaults to 1.
     *  Higher values let keyword matchers check less-likely hypotheses,
     *  improving accuracy for short ambiguous words like "less" vs "yes". */
    maxAlternatives?: number;
};

type UseSpeechRecognitionReturn = {
    /** Whether the browser supports the Web Speech API. */
    supported: boolean;
    /** Whether recognition is currently active. */
    listening: boolean;
    /** Start a single-shot recognition session. */
    start: () => void;
    /** Stop recognition immediately. */
    stop: () => void;
    /** Current error code (e.g. "not-allowed", "no-speech"), or null. Auto-clears after 3 seconds. */
    error: string | null;
};

const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
    typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;

/**
 * Low-level hook wrapping the Web Speech API for single-shot voice recognition.
 *
 * Handles feature detection, interim/final results, error state with auto-clear,
 * and cleanup on unmount. The caller provides callbacks for results — this hook
 * does not manage what happens with the recognized text.
 */
export function useSpeechRecognition({
    onResult,
    onInterimResult,
    lang,
    maxAlternatives = 1,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
    const supported = !!SpeechRecognitionAPI;
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const listeningRef = useRef(false);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep callbacks in refs so the recognition instance doesn't need to be recreated
    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;
    const onInterimResultRef = useRef(onInterimResult);
    onInterimResultRef.current = onInterimResult;

    // Create and configure the recognition instance once
    useEffect(() => {
        if (!SpeechRecognitionAPI) return;

        const recognition = new SpeechRecognitionAPI();
        // Single-shot mode: the browser captures one utterance, fires onresult
        // with isFinal: true once it detects a silence pause (~0.5–1.5s), then
        // automatically ends the session (onend). The caller is responsible for
        // calling start() again to listen for the next utterance — in our case,
        // the auto-restart effect in useVoiceCommandFlow chains sessions together
        // to create a continuous listening experience.
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = maxAlternatives;
        recognition.lang = lang ?? "en";

        // The browser fires onresult repeatedly as the user speaks. Each event
        // contains results marked as interim (still changing — best guess so far)
        // or final (locked in — speech segment complete).
        //
        // onInterimResult fires many times per utterance with evolving text
        // ("kit" → "kitch" → "kitchen") — used for live display in the input.
        // onResult fires once per finalized segment with the confirmed transcript
        // and alternative hypotheses — triggers actual command processing.
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = "";
            let final = "";
            const alternatives: string[] = [];

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                    // Collect alternative transcripts (index 1+)
                    for (let j = 1; j < result.length; j++) {
                        alternatives.push(result[j].transcript);
                    }
                } else {
                    interim += result[0].transcript;
                }
            }

            if (interim && onInterimResultRef.current) {
                onInterimResultRef.current(interim);
            }
            if (final) {
                onResultRef.current(final, alternatives.length > 0 ? alternatives : undefined);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // "aborted" fires when we call stop() — not a real error
            if (event.error === "aborted") return;

            setError(event.error);
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            errorTimerRef.current = setTimeout(() => setError(null), 3000);
        };

        recognition.onstart = () => {
            listeningRef.current = true;
            setListening(true);
        };

        recognition.onend = () => {
            listeningRef.current = false;
            setListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, [lang, maxAlternatives]);

    const start = useCallback(() => {
        if (!recognitionRef.current || listeningRef.current) return;
        setError(null);
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.warn("[SpeechRecognition] start() failed:", e);
        }
    }, []);

    const stop = useCallback(() => {
        if (!recognitionRef.current || !listeningRef.current) return;
        recognitionRef.current.stop();
    }, []);

    return { supported, listening, start, stop, error };
}
