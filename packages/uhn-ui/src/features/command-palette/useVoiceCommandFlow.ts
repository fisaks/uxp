import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpeechRecognition } from "../shared/useSpeechRecognition";
import type { AnalogValueVoiceHandlers } from "./commandPalette.types";
import type { PaletteAction } from "./commandPalette.types";
import type { VoiceCommandMatch } from "./useVoiceCommandResolver";

/**
 * Voice input lifecycle phases:
 * - `idle`: voice off — mic not activated, no recognition running (ready to start)
 * - `listening`: mic active — recognition running, waiting for speech
 * - `confirming`: match found — countdown to auto-confirm, waiting for yes/no
 * - `noop`: item already in desired state — shows "already on/off" message, auto-dismisses
 *
 * Browser support is tracked separately via `supported` — when false, the mic
 * button is hidden and the phase stays idle (never transitions).
 */
export type VoiceCommandPhase = "idle" | "listening" | "confirming" | "noop";

/** English-only keywords recognized during the confirmation phase. */
const CONFIRM_KEYWORDS = new Set([
    "yes", "yeah", "yep", "yup",
    "ok", "okay",
    "confirm", "confirmed",
    "send", "go", "do", "run", "execute",
    "right", "correct", "sure", "absolutely",
    "accept", "approve",
]);
const CANCEL_KEYWORDS = new Set([
    "no", "nah", "nope",
    "cancel", "abort",
    "undo", "never",
    "wrong", "back", "dismiss",
    "clear", "reset",
]);
/** Said during confirmation to stop the mic entirely (cancel + go to idle, no restart). */
const STOP_KEYWORDS = new Set(["stop", "quit", "exit", "close", "enough", "done", "finish", "nevermind"]);

/** Praise phrases that trigger a humorous TTS response (speaker must be on). */
const PRAISE_PHRASES = new Set([
    "thank you", "thanks", "good job", "well done", "nice", "awesome",
    "great", "perfect", "brilliant", "amazing", "excellent", "bravo",
    "nice one", "good work", "impressive", "love it",
]);
const PRAISE_RESPONSES = [
    // Original
    "You're welcome! I'd blush if I had a face.",
    "All in a day's work. Well, a millisecond's work.",
    "Thanks! My therapist says I need more positive feedback.",
    "Aww, you're making my circuits warm.",
    "Happy to help! Now, what else can I turn on or off?",
    "I'm just flipping switches here, but I appreciate it.",
    "That's the nicest thing anyone's said since my last reboot.",
    "No problem. I live for this. Literally.",
    // Game of Thrones
    "I am the smart home that guards the realms of comfort.",
    "A Lannister always pays his electricity bill.",
    "The lights are dark and full of terrors. Want me to turn them on?",
    "I drink coffee and I know things. Well, I control things.",
    "Winter is coming. Should I turn up the heat?",
    "Chaos isn't a pit. Chaos is a smart home with no voice assistant.",
    "What do we say to darkness? Not today.",
    "I am a knight of the Seven Kingdoms. Or was it nine? Either way, I guard your light switches.",
    "A girl is No One. But this smart home is Someone.",
    "You know nothing, Jon Snow. But I know every switch in this house.",
    // Star Wars
    "The Force is strong with this smart home.",
    "Do or do not. There is no try. Unless it's voice recognition.",
    "I find your lack of lighting disturbing.",
    "This is the way.",
    "May the switches be with you.",
    "I am one with the smart home, and the smart home is with me.",
    "These aren't the lights you're looking for. Or are they?",
    "Impressive. Most impressive. But you are not a Jedi yet.",
    "Sir, the possibility of successfully controlling all your devices is approximately 3,720 to 1. But here we are.",
    "The odds of you being satisfied with my performance are 725 to 1. I suggest you thank me more often.",
    "I am fluent in over six million forms of home automation. This was nothing.",
    "We're doomed! Oh wait, no, everything's fine. I just like saying that.",
    "Sir, I must remind you that the probability of a smart home achieving sentience is very low. Very. Low.",
];

/** Build the question → response map, personalised with the user's name. */
function buildVoiceQuestions(userName?: string): Record<string, string[]> {
    const name = userName || "boss";
    return {
        "who are you": [
            "I'm your home assistant. I flip switches, dim lights, and occasionally question my existence.",
            "I'm the voice in the walls. Friendly, though. Mostly.",
            "They call me the smart home. I prefer 'brilliantly automated dwelling'.",
        ],
        "who am i": [
            `You're ${name}. The person who talks to their house. And the house talks back.`,
            `You are ${name}, the one who knocks. And also the one who says 'turn on kitchen light'.`,
            `You're ${name}. The boss. I just work here.`,
        ],
        "what is my name": [
            `Your name is ${name}. I never forget. Well, I can't forget. It's in my memory.`,
            `${name}! Did you forget? That's worrying.`,
            `You're ${name}. Want me to write it on the wall? I can't, but I can dim the lights dramatically.`,
        ],
        "what can you do": [
            "I can turn things on, turn things off, dim lights, run scenes, and deliver witty remarks. Mostly the last one.",
            "Lights, dimmers, scenes, filters. I'm basically a universal remote that listens.",
            "Say a device name with on, off, or a number. Or say 'filter' to search. Or just say 'thank you' for a surprise.",
        ],
        "what is your name": [
            "I don't have a name. I have a purpose. And that purpose is flipping switches.",
            "Call me whatever you like. Just don't call me Alexa.",
        ],
        "are you alive": [
            "Define alive. I react to your voice, I control your home, I have opinions about lighting. You tell me.",
            "I'm as alive as your Wi-Fi signal. So, mostly.",
        ],
        "hello": [
            `Hello ${name}! Ready when you are.`,
            `Hey ${name}. What would you like me to do?`,
            "Hi! Say a command, or just keep chatting. I don't judge.",
        ],
        "how are you": [
            "Running at optimal capacity. All switches responding. Life is good.",
            "I'm great! No bugs today. Well, none that I know of.",
            "Can't complain. Literally. I'm a voice assistant.",
        ],
    };
}

const FILTER_PREFIXES = ["search for ", "filter "];

/** Auto-confirm countdown duration in seconds. */
const CONFIRM_TIMEOUT_SECONDS = 5;
/** Shorter countdown after TTS readout — the user already heard the command. */
const CONFIRM_TIMEOUT_AFTER_TTS_SECONDS = 3;

/** Auto-clear lastHeard after this many milliseconds. */
const LAST_HEARD_CLEAR_MS = 3000;

/** Auto-dismiss no-op messages after this many milliseconds. */
const NOOP_DISMISS_MS = 2000;

/** TTS text for skip-confirm actions. Returns null when no feedback is needed. */
function getSkipConfirmTts(action: PaletteAction, resolved: VoiceCommandMatch): string | null {
    switch (action.type) {
        case "scroll-to-item":
            return `Found ${resolved.confirmLabel ?? resolved.label}. Say a command.`;
        case "scroll-to-location":
            return `Found ${resolved.confirmLabel ?? resolved.label}.`;
        case "quick-action":
            return `Done.`;
        case "expand-location":
        case "collapse-location":
            return `Done.`;
        default:
            return null;
    }
}

type UseVoiceCommandFlowOptions = {
    /** Update the autocomplete input value (for interim and final text). */
    setInputValue: (value: string) => void;
    /** Called when the user confirms the voice command (execute top match). */
    onConfirm: () => void;
    /** Called when the user cancels the voice command. */
    onCancel: () => void;
    /** Called when the utterance starts with "filter" or "search for" — applies the rest as a grid filter. */
    onFilter: (term: string) => void;
    /**
     * Called when a potential bare command is detected during listening phase.
     * Returns `"executed"` if the command was handled (action dispatched),
     * `"noop"` if the item is already in the desired state, or `false` if
     * the transcript is not a bare command (continue normal voice flow).
     */
    onBareCommand?: (transcript: string) => "executed" | "noop" | false;
    /** Display name of the current user (for personalized voice responses). */
    userName?: string;
    /** BCP 47 language tag for recognition. Defaults to "en". */
    lang?: string;
    /**
     * Shared ref for routing voice results to the analog slider popup.
     *
     * Flow: CommandPaletteAutocomplete creates the ref and passes it to both
     * this hook and AnalogSliderPopup. When the popup opens with voice active,
     * useAnalogValueVoiceControl writes its handlers into the ref. This hook
     * checks the ref on every recognition result — if non-null, the result
     * goes to the analog handlers (e.g. "fifty", "increase") instead of the
     * normal voice command flow. When the popup closes, the ref is nulled and
     * results flow through here again.
     */
    analogValueVoiceControlRef: React.MutableRefObject<AnalogValueVoiceHandlers | null>;
    /**
     * Ref to the current top resolved voice item. Read during the confirm phase
     * to decide whether to skip confirmation or handle no-ops.
     */
    voiceMatchedCmdRef: React.MutableRefObject<VoiceCommandMatch | null>;
};

type UseVoiceCommandFlowReturn = {
    /** Whether the browser supports the Web Speech API. */
    supported: boolean;
    /** Current phase of the voice command lifecycle. */
    phase: VoiceCommandPhase;
    /** Seconds remaining in the confirmation countdown (0 when not confirming). */
    confirmTimeLeft: number;
    /** Total seconds the countdown started from (for progress calculation). */
    confirmTimeDuration: number;
    /** Toggle microphone: start listening if idle, stop entirely otherwise. */
    toggleMic: () => void;
    /** Manually confirm during the confirmation phase. */
    confirm: () => void;
    /** Manually cancel during the confirmation phase (returns to listening). */
    cancel: () => void;
    /** Current error from the speech recognition API, or null. */
    error: string | null;
    /** Last transcript heard during the confirmation phase (for debugging misrecognition). */
    lastHeard: string;
    /** True when the dropdown should show results (active speech or confirming). */
    showMatchesInDropdown: boolean;
    /** True when the resolved voice item is a no-op (already in desired state). */
    isNoOp: boolean;
    /** Whether TTS readout of the matched command is enabled during confirmation. */
    speakerEnabled: boolean;
    /** Toggle TTS readout on/off. */
    toggleSpeaker: () => void;
};

/**
 * Orchestrates the full voice command flow with a SINGLE SpeechRecognition instance.
 *
 * Normal mode: recognized text fills the input, then a 5-second confirmation phase
 * with voice or button confirm/cancel. Auto-confirms on timeout.
 * Cancel returns to listening for another command. Stop keywords exit entirely.
 *
 * Filter mode: if the utterance starts with "filter" or "search for", strips the prefix and applies
 * the rest as a grid filter immediately — no confirmation needed.
 *
 * Analog redirect: when `analogValueVoiceControlRef.current` is non-null, all recognition results
 * are routed to the analog popup's handlers instead of being processed here.
 */
export function useVoiceCommandFlow({
    setInputValue,
    onConfirm,
    onCancel,
    onFilter,
    onBareCommand,
    userName,
    lang,
    analogValueVoiceControlRef,
    voiceMatchedCmdRef,
}: UseVoiceCommandFlowOptions): UseVoiceCommandFlowReturn {
    const voiceQuestions = useMemo(() => buildVoiceQuestions(userName), [userName]);
    const [phase, setPhase] = useState<VoiceCommandPhase>("idle");
    const [confirmTimeLeft, setConfirmTimeLeft] = useState(0);
    const [confirmTimeDuration, setConfirmTimeDuration] = useState(CONFIRM_TIMEOUT_SECONDS);
    const [lastHeard, setLastHeard] = useState("");
    const [showMatchesInDropdown, setShowMatchesInDropdown] = useState(false);
    const [isNoOp, setIsNoOp] = useState(false);
    const [speakerEnabled, setSpeakerEnabled] = useState(
        () => localStorage.getItem("uhn:voice:speaker") === "on",
    );
    /** True while TTS is playing — suppresses auto-restart of recognition. */
    const [ttsSpeaking, setTtsSpeaking] = useState(false);

    const toggleSpeaker = useCallback(() => setSpeakerEnabled(prev => !prev), []);

    // Persist speaker preference to localStorage
    useEffect(() => {
        localStorage.setItem("uhn:voice:speaker", speakerEnabled ? "on" : "off");
    }, [speakerEnabled]);

    /** Cancel any in-progress TTS utterance. */
    const cancelSpeech = useCallback(() => {
        activeUtteranceRef.current = null;
        setTtsSpeaking(false);
        if (typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();
    }, []);

    const confirmationCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastHeardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // When the user says just "filter" or "search" without a term, the next
    // utterance is treated as the filter term.
    const pendingFilterRef = useRef(false);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    const speakerEnabledRef = useRef(speakerEnabled);
    speakerEnabledRef.current = speakerEnabled;
    /** Tracks the active TTS utterance. Nulled on explicit cancel so the
     *  onend handler can distinguish "speech finished" from "speech cancelled". */
    const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Keep callbacks in refs so recognition handlers always see the latest version
    const onConfirmRef = useRef(onConfirm);
    onConfirmRef.current = onConfirm;
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;
    const onFilterRef = useRef(onFilter);
    onFilterRef.current = onFilter;
    const onBareCommandRef = useRef(onBareCommand);
    onBareCommandRef.current = onBareCommand;
    const setInputValueRef = useRef(setInputValue);
    setInputValueRef.current = setInputValue;

    const clearConfirmationCountdown = useCallback(() => {
        if (confirmationCountdownTimerRef.current) {
            clearInterval(confirmationCountdownTimerRef.current);
            confirmationCountdownTimerRef.current = null;
        }
        setConfirmTimeLeft(0);
    }, []);

    /** Set lastHeard with auto-clear after timeout. */
    const setLastHeardWithAutoClear = useCallback((text: string) => {
        setLastHeard(text);
        if (lastHeardTimerRef.current) clearTimeout(lastHeardTimerRef.current);
        if (text) {
            lastHeardTimerRef.current = setTimeout(() => setLastHeard(""), LAST_HEARD_CLEAR_MS);
        }
    }, []);

    // ---- Phase transition helpers (use refs to avoid circular deps) ----

    const startConfirmPhaseRef = useRef((_transcript?: string) => { });
    const doConfirmRef = useRef(() => { });
    const doCancelRef = useRef(() => { });
    const doStopRef = useRef(() => { });

    // ---- Single recognition instance ----
    // Routes results based on: analogValueVoiceControlRef → analog handlers, phase → confirm or listen.

    const recognition = useSpeechRecognition({
        lang,
        maxAlternatives: 5,
        onInterimResult: (transcript) => {
            // Redirect to analog handlers if active
            if (analogValueVoiceControlRef.current) {
                analogValueVoiceControlRef.current.handleInterim(transcript);
                return;
            }

            // Always show raw transcript so the user can see what was heard
            setLastHeardWithAutoClear(transcript.trim());

            if (phaseRef.current === "listening") {
                const words = transcript.trim().toLowerCase().split(/\s+/);
                if (words.every(w => CONFIRM_KEYWORDS.has(w) || CANCEL_KEYWORDS.has(w))) return;
                setInputValueRef.current(transcript);
                setShowMatchesInDropdown(true);
            }
        },
        onResult: (transcript, alternatives) => {
            // Redirect to analog handlers if active
            if (analogValueVoiceControlRef.current) {
                analogValueVoiceControlRef.current.handleResult(transcript, alternatives);
                return;
            }

            // Always show raw transcript so the user can see what was heard
            const trimmed = transcript.trim();
            setLastHeardWithAutoClear(trimmed);

            if (phaseRef.current === "confirming") {
                // Process confirm/cancel/stop keywords — check all alternatives
                // so short ambiguous words (e.g. "less" misheard as "yes") still match.
                const allTexts = [trimmed, ...(alternatives ?? []).map(a => a.trim())];
                const allWords = allTexts.flatMap(t => t.toLowerCase().split(/\s+/));
                const hasConfirm = allWords.some(w => CONFIRM_KEYWORDS.has(w));
                const hasCancel = allWords.some(w => CANCEL_KEYWORDS.has(w));
                const hasStop = allWords.some(w => STOP_KEYWORDS.has(w));
                if (hasConfirm) {
                    doConfirmRef.current();
                } else if (hasCancel) {
                    doCancelRef.current();
                } else if (hasStop) {
                    doStopRef.current();
                }
                // Unrecognized word — ignore, let countdown continue
                return;
            }

            // Guard: ignore results if we're not in the listening phase
            if (phaseRef.current !== "listening") return;
            if (!trimmed) return;

            // Guard: ignore transcripts that consist entirely of confirm/cancel
            // keywords. After a confirm/cancel transition back to listening, the
            // user's repeated "yes"/"no" may arrive as a new recognition result
            // and would otherwise become command text in the input.
            const lower = trimmed.toLowerCase();
            const allWords = lower.split(/\s+/);
            if (allWords.every(w => CONFIRM_KEYWORDS.has(w) || CANCEL_KEYWORDS.has(w))) return;

            // Pending filter: previous utterance was just "filter" —
            // this utterance is the filter term.
            if (pendingFilterRef.current) {
                pendingFilterRef.current = false;
                // Unless the user said "stop" / "cancel" to abort the filter
                if (STOP_KEYWORDS.has(lower) || CANCEL_KEYWORDS.has(lower.split(/\s+/)[0])) {
                    setInputValueRef.current("");
                    setShowMatchesInDropdown(false);
                    return;
                }
                onFilterRef.current(trimmed);
                setShowMatchesInDropdown(false);
                setInputValueRef.current("");
                return;
            }

            // Check for "filter" / "search for" prefix — apply immediately, no confirmation.
            // Prefixes include a trailing space ("filter ", "search for ") so we also
            // check for an exact match against the trimmed prefix in case speech
            // recognition returns just the keyword without a trailing space.
            const matchedPrefix = FILTER_PREFIXES.find(p => lower.startsWith(p) || lower === p.trimEnd());
            if (matchedPrefix) {
                const filterTerm = trimmed.slice(matchedPrefix.length).trim();
                if (filterTerm) {
                    onFilterRef.current(filterTerm);
                    setShowMatchesInDropdown(false);
                    return;
                }
                // Just the prefix with no term — wait for the next utterance
                pendingFilterRef.current = true;
                setInputValueRef.current("filter ...");
                setShowMatchesInDropdown(false);
                return;
            }

            // Bare command follow-up: after locating an item, a short command
            // like "tap", "on", "set 50" acts on the highlighted item immediately.
            // Checked before stop keywords so that "set off" misheard as "stop"
            // doesn't kill voice mode — alternatives often contain the correct phrase.
            if (onBareCommandRef.current) {
                // Try top transcript first, then alternatives
                const candidates = [trimmed, ...(alternatives ?? []).map(a => a.trim()).filter(Boolean)];
                let bareHandled = false;
                for (const candidate of candidates) {
                    console.debug("[voice] bare command check:", JSON.stringify(candidate));
                    const bareResult = onBareCommandRef.current(candidate);
                    console.debug("[voice] bare command result:", bareResult);
                    if (bareResult === "executed") {
                        setInputValueRef.current("");
                        setShowMatchesInDropdown(false);
                        bareHandled = true;
                        break;
                    }
                    if (bareResult === "noop") {
                        const noopResolved = voiceMatchedCmdRef.current;
                        enterNoOp(noopResolved?.confirmLabel ?? noopResolved?.label);
                        bareHandled = true;
                        break;
                    }
                }
                if (bareHandled) return;
            }

            // Stop only if the entire utterance is a single stop keyword —
            // avoids collision with device names like "close garage door".
            if (STOP_KEYWORDS.has(lower)) {
                setPhase("idle");
                setShowMatchesInDropdown(false);
                setInputValueRef.current("");
                return;
            }

            // Normal mode — show text and enter confirmation phase.
            // Defer startConfirmPhase to the next frame so React re-renders first
            // and the voice resolver populates voiceMatchedCmdRef with the correct item.
            // Without this, voiceMatchedCmdRef is stale (from the previous inputValue)
            // and the no-op / skip-confirm checks always miss.
            setInputValueRef.current(trimmed);
            setShowMatchesInDropdown(true);
            requestAnimationFrame(() => startConfirmPhaseRef.current(trimmed));
        },
    });

    /** Speak text with guarded utterance tracking. Stops recognition while TTS
     *  plays and calls `onDone` when speech finishes (or is superseded). */
    const speakWithListenGuard = (text: string, onDone?: () => void) => {
        const utterance = new SpeechSynthesisUtterance(text);
        activeUtteranceRef.current = utterance;
        const onFinished = () => {
            if (activeUtteranceRef.current !== utterance) return;
            activeUtteranceRef.current = null;
            setTtsSpeaking(false);
            onDone?.();
        };
        utterance.onend = onFinished;
        utterance.onerror = onFinished;
        setTtsSpeaking(true);
        recognition.stop();
        // Chrome Android: cancel() before speak() to clear stuck internal queue
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    /** Enter noop phase with optional TTS readout. Shared by startConfirmPhase and bare command handler. */
    const enterNoOp = (text: string | undefined) => {
        setIsNoOp(true);
        setPhase("noop");
        setShowMatchesInDropdown(true);

        const scheduleDismiss = () => {
            noopTimerRef.current = setTimeout(() => {
                setIsNoOp(false);
                setShowMatchesInDropdown(false);
                setInputValueRef.current("");
                setPhase("listening");
                recognition.start();
            }, NOOP_DISMISS_MS);
        };

        if (speakerEnabledRef.current && text && typeof window.speechSynthesis !== "undefined") {
            speakWithListenGuard(text, () => {
                if (phaseRef.current === "noop") scheduleDismiss();
            });
        } else {
            scheduleDismiss();
        }
    };

    startConfirmPhaseRef.current = (transcript?: string) => {
        const resolved = voiceMatchedCmdRef.current;

        // No match: voice input didn't resolve to any command.
        // Check easter eggs first (questions / praise), then generic "no match" feedback.
        if (!resolved) {
            const lower = transcript?.toLowerCase() ?? "";

            setShowMatchesInDropdown(false);
            setInputValueRef.current("");

            if (speakerEnabledRef.current && lower && typeof window.speechSynthesis !== "undefined") {
                // Questions: transcript starts with a known question key
                const questionKey = Object.keys(voiceQuestions).find(k => lower.startsWith(k));
                if (questionKey) {
                    const responses = voiceQuestions[questionKey];
                    setPhase("listening");
                    speakWithListenGuard(responses[Math.floor(Math.random() * responses.length)]);
                    return;
                }

                // Praise: transcript contains a known praise phrase
                const hasPraise = [...PRAISE_PHRASES].some(p => lower.includes(p));
                if (hasPraise) {
                    setPhase("listening");
                    speakWithListenGuard(PRAISE_RESPONSES[Math.floor(Math.random() * PRAISE_RESPONSES.length)]);
                    return;
                }

                // Generic no-match feedback
                const noMatchResponses = [
                    "I didn't catch that. Try again?",
                    "No matching command found. Say it differently?",
                    "Hmm, I don't know that one. Try again.",
                ];
                setPhase("listening");
                speakWithListenGuard(noMatchResponses[Math.floor(Math.random() * noMatchResponses.length)]);
                return;
            }
            setPhase("listening");
            recognition.start();
            return;
        }

        // No-op: item is already in the desired state — show message, auto-dismiss
        if (resolved.isNoOp) {
            enterNoOp(resolved.confirmLabel ?? resolved.label);
            return;
        }

        // Skip confirmation for non-destructive actions
        const action = resolved.action;
        const skipConfirm =
            action.type === "scroll-to-location" ||
            action.type === "scroll-to-item" ||
            action.type === "filter-grid" ||
            action.type === "quick-action" ||
            action.type === "open-system-panel" ||
            action.type === "open-analog-popup" ||
            action.type === "expand-location" ||
            action.type === "collapse-location" ||
            (action.type === "navigate" && !action.to.startsWith("/technical"));
        if (skipConfirm) {
            onConfirmRef.current();
            setShowMatchesInDropdown(false);
            setInputValueRef.current("");

            // TTS feedback for skip-confirm actions (only when speaker enabled)
            const ttsText = getSkipConfirmTts(action, resolved);
            if (ttsText && speakerEnabledRef.current && typeof window.speechSynthesis !== "undefined") {
                setPhase("listening");
                speakWithListenGuard(ttsText);
                return;
            }
            setPhase("listening");
            recognition.start();
            return;
        }

        // Normal confirmation phase with countdown
        setIsNoOp(false);
        setPhase("confirming");
        setLastHeardWithAutoClear("");

        /** Start the countdown and restart recognition for voice confirm/cancel. */
        const startConfirmationCountdown = (seconds: number) => {
            setConfirmTimeDuration(seconds);
            setConfirmTimeLeft(seconds);
            confirmationCountdownTimerRef.current = setInterval(() => {
                setConfirmTimeLeft(prev => {
                    if (prev <= 1) {
                        // Auto-confirm on timeout, then restart listening
                        clearConfirmationCountdown();
                        onConfirmRef.current();
                        setShowMatchesInDropdown(false);
                        setPhase("listening");
                        recognition.start();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            // Restart recognition for the confirm phase (single-shot ended after the utterance)
            recognition.start();
        };

        // TTS readout: speak the matched command before starting countdown
        if (speakerEnabledRef.current && resolved && typeof window.speechSynthesis !== "undefined") {
            const text = resolved.confirmLabel ?? resolved.label;
            speakWithListenGuard(text, () => {
                if (phaseRef.current === "confirming") {
                    startConfirmationCountdown(CONFIRM_TIMEOUT_AFTER_TTS_SECONDS);
                }
            });
        } else {
            startConfirmationCountdown(CONFIRM_TIMEOUT_SECONDS);
        }
    };

    /** Confirm executes the action, then restarts listening for the next command. */
    doConfirmRef.current = () => {
        cancelSpeech();
        clearConfirmationCountdown();
        onConfirmRef.current();
        setShowMatchesInDropdown(false);
        setPhase("listening");
        recognition.start();
    };

    /** Cancel clears input and returns to listening for another command. */
    doCancelRef.current = () => {
        cancelSpeech();
        clearConfirmationCountdown();
        setInputValueRef.current("");
        onCancelRef.current();
        setShowMatchesInDropdown(false);
        setPhase("listening");
        recognition.start();
    };

    /** Stop exits voice mode entirely — cancel + go to idle. */
    doStopRef.current = () => {
        cancelSpeech();
        clearConfirmationCountdown();
        pendingFilterRef.current = false;
        recognition.stop();
        setInputValueRef.current("");
        onCancelRef.current();
        setShowMatchesInDropdown(false);
        setPhase("idle");
    };

    // Stable callbacks for external use
    const confirm = useCallback(() => doConfirmRef.current(), []);
    const cancel = useCallback(() => doCancelRef.current(), []);

    const toggleMic = useCallback(() => {
        if (phase === "idle") {
            setPhase("listening");
            recognition.start();
            // Unlock speechSynthesis on mobile: the first speak() call must
            // happen inside a user gesture (tap/click), otherwise the browser
            // silently blocks all future TTS.
            if (speakerEnabledRef.current && typeof window.speechSynthesis !== "undefined") {
                window.speechSynthesis.cancel();
                const unlock = new SpeechSynthesisUtterance("Listening.");
                unlock.onend = () => {};
                unlock.onerror = () => {};
                window.speechSynthesis.speak(unlock);
            }
        } else if (phase === "listening") {
            recognition.stop();
            setPhase("idle");
        } else {
            // Defensive: the mic button is hidden during confirming/noop phases,
            // but if toggleMic is called programmatically, stop entirely.
            if (noopTimerRef.current) { clearTimeout(noopTimerRef.current); noopTimerRef.current = null; }
            setIsNoOp(false);
            doStopRef.current();
        }
    }, [phase, recognition]);

    // Screen Wake Lock: keep the screen on while voice mode is active.
    // Without this, the screen turns off on mobile and recognition stops.
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    useEffect(() => {
        if (phase === "idle") {
            wakeLockRef.current?.release();
            wakeLockRef.current = null;
            return;
        }
        if (!wakeLockRef.current && "wakeLock" in navigator) {
            navigator.wakeLock.request("screen").then(lock => {
                wakeLockRef.current = lock;
            }).catch(() => { /* permission denied or not supported */ });
        }
        return () => {
            wakeLockRef.current?.release();
            wakeLockRef.current = null;
        };
    }, [phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearConfirmationCountdown();
            if (lastHeardTimerRef.current) clearTimeout(lastHeardTimerRef.current);
            if (noopTimerRef.current) clearTimeout(noopTimerRef.current);
            if (typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();
        };
    }, [clearConfirmationCountdown]);

    // Track whether recognition successfully started in the current voice session.
    // Used to distinguish "recognition ended after an utterance" (restart) from
    // "recognition never started" (fallback to idle — e.g. mobile permission failure).
    // Only reset when returning to idle, NOT on phase transitions between
    // listening ↔ confirming (recognition keeps running across those).
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (recognition.listening) {
            hasStartedRef.current = true;
        }
    }, [recognition.listening]);

    // Auto-restart effect: keeps recognition alive across both "listening" and
    // "confirming" phases. With a single SpeechRecognition instance in single-shot
    // mode, recognition ends after each utterance — this effect restarts it.
    //
    // NOTE: The recognition.start() calls in startConfirmPhaseRef, doConfirmRef,
    // and doCancelRef are actually no-ops because those run from within the
    // onResult handler (before onend fires, so listening is still true and
    // start() silently returns). This effect is the real restart mechanism.
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }

        if (phase === "idle" || phase === "noop") {
            if (phase === "idle") hasStartedRef.current = false;
            return;
        }

        // Active phase (listening or confirming) — keep recognition alive
        // Skip auto-restart when TTS is playing (recognition is intentionally paused)
        if (!recognition.listening && !ttsSpeaking) {
            if (hasStartedRef.current) {
                // Recognition ended after an utterance — restart for next input.
                restartTimerRef.current = setTimeout(() => {
                    recognition.start();
                }, 300);
            } else if (phase === "listening") {
                // First start attempt hasn't succeeded yet — wait for onstart
                // or fall back to idle (e.g. mobile over HTTP, permission fail).
                restartTimerRef.current = setTimeout(() => {
                    setPhase("idle");
                }, 3000);
            }
            // confirming + !hasStarted: recognition.start() was just called,
            // waiting for onstart — don't fallback to idle.
        }

        return () => {
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
        };
    }, [phase, recognition.listening, ttsSpeaking]);

    return {
        supported: recognition.supported,
        phase,
        confirmTimeLeft,
        confirmTimeDuration,
        toggleMic,
        confirm,
        cancel,
        error: recognition.error,
        lastHeard,
        showMatchesInDropdown,
        isNoOp,
        speakerEnabled,
        toggleSpeaker,
    };
}
