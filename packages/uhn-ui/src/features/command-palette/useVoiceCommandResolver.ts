import { useMemo } from "react";
import { exactTokenMatch, searchTokens } from "../shared/fuzzyMatch";
import { parseSpokenNumber } from "../shared/parseSpokenNumber";
import { PaletteItem } from "./commandPalette.types";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type VoiceIntent =
    | { type: "on" }
    | { type: "off" }
    | { type: "toggle" }
    | { type: "set"; value: number }
    | { type: "set-open" }
    | { type: "execute" }
    | { type: "locate" };

export type VoiceCommandMatch = PaletteItem & {
    confirmLabel: string;
    isNoOp?: boolean;
};

/** A bare command spoken after locating an item (e.g. "on", "off", "set 50"). */
export type BareCommand =
    | { type: "on" }
    | { type: "off" }
    | { type: "toggle" }
    | { type: "set"; value: number }
    | { type: "set-open" }
    | { type: "execute" };

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const TOGGLE_WORDS = new Set(["toggle", "switch", "flip"]);
const EXECUTE_WORDS = new Set(["activate", "run"]);
const COMMAND_PREFIXES = new Set(["set", "turn"]);
const ON_WORDS = new Set(["on"]);
const OFF_WORDS = new Set(["off"]);

/* ------------------------------------------------------------------ */
/* Intent parsing                                                       */
/* ------------------------------------------------------------------ */

type ParseResult = { intent: VoiceIntent; searchQuery: string };

/**
 * Try to parse a number from the last 1-2 tokens of an array.
 * Returns the parsed number and how many tokens were consumed, or null.
 */
function parseTrailingNumber(tokens: string[]): { value: number; consumed: number } | null {
    if (tokens.length === 0) return null;

    // Try last 1 token
    const last1 = tokens[tokens.length - 1];
    const result1 = parseSpokenNumber(last1);

    // Try last 2 tokens (compound number like "twenty five")
    let result2: number | null = null;
    if (tokens.length >= 2) {
        const last2 = `${tokens[tokens.length - 2]} ${last1}`;
        result2 = parseSpokenNumber(last2);
    }

    // "percent" as a trailing word: "50 percent" or "fifty percent"
    // If last token is "percent", check the token(s) before it
    if (last1 === "percent" || last1 === "%") {
        if (tokens.length >= 2) {
            const beforePercent = tokens[tokens.length - 2];
            const numBeforePercent = parseSpokenNumber(beforePercent);
            if (numBeforePercent != null) return { value: numBeforePercent, consumed: 2 };
        }
        if (tokens.length >= 3) {
            const twoBeforePercent = `${tokens[tokens.length - 3]} ${tokens[tokens.length - 2]}`;
            const numTwoBeforePercent = parseSpokenNumber(twoBeforePercent);
            if (numTwoBeforePercent != null) return { value: numTwoBeforePercent, consumed: 3 };
        }
        return null;
    }

    // Prefer compound (2 tokens) when it's larger — "twenty five" (25) vs "five" (5)
    if (result2 != null && result1 != null && result2 > result1) {
        return { value: result2, consumed: 2 };
    }
    if (result1 != null) return { value: result1, consumed: 1 };
    if (result2 != null) return { value: result2, consumed: 2 };

    return null;
}

export function parseVoiceIntent(transcript: string): ParseResult {
    const tokens = searchTokens(transcript);
    if (tokens.length === 0) return { intent: { type: "locate" }, searchQuery: "" };

    const first = tokens[0];

    // 1. Command prefix: "set" or "turn"
    if (COMMAND_PREFIXES.has(first) && tokens.length >= 2) {
        const rest = tokens.slice(1);
        const second = rest[0];

        // "set on ..." / "turn on ..."
        if (ON_WORDS.has(second)) {
            return { intent: { type: "on" }, searchQuery: rest.slice(1).join(" ") };
        }
        // "set off ..." / "turn off ..."
        if (OFF_WORDS.has(second)) {
            return { intent: { type: "off" }, searchQuery: rest.slice(1).join(" ") };
        }

        // "turn ... on" / "set ... off" (split pattern — on/off at end)
        const lastRest = rest[rest.length - 1];
        if (rest.length >= 2 && ON_WORDS.has(lastRest)) {
            return { intent: { type: "on" }, searchQuery: rest.slice(0, -1).join(" ") };
        }
        if (rest.length >= 2 && OFF_WORDS.has(lastRest)) {
            return { intent: { type: "off" }, searchQuery: rest.slice(0, -1).join(" ") };
        }

        // Trailing number: "set dimmer 50" / "set dimmer fifty"
        const trailingNum = parseTrailingNumber(rest);
        if (trailingNum) {
            const searchPart = rest.slice(0, rest.length - trailingNum.consumed);
            return { intent: { type: "set", value: trailingNum.value }, searchQuery: searchPart.join(" ") };
        }

        // No number, no on/off — "set <device>" without a value.
        // Strip the prefix and target analog popup items.
        return { intent: { type: "set-open" }, searchQuery: rest.join(" ") };
    }

    // 2. Toggle words: "toggle", "switch", "flip"
    if (TOGGLE_WORDS.has(first)) {
        return { intent: { type: "toggle" }, searchQuery: tokens.slice(1).join(" ") };
    }

    // 3. Execute words: "activate", "run"
    if (EXECUTE_WORDS.has(first)) {
        return { intent: { type: "execute" }, searchQuery: tokens.slice(1).join(" ") };
    }

    // 4. No prefix — check end position for "on"/"off"
    if (tokens.length >= 2) {
        const last = tokens[tokens.length - 1];
        if (ON_WORDS.has(last)) {
            return { intent: { type: "on" }, searchQuery: tokens.slice(0, -1).join(" ") };
        }
        if (OFF_WORDS.has(last)) {
            return { intent: { type: "off" }, searchQuery: tokens.slice(0, -1).join(" ") };
        }
    }

    // 5. Trailing number without prefix: "dimmer 50"
    const trailingNum = parseTrailingNumber(tokens);
    if (trailingNum) {
        const searchPart = tokens.slice(0, tokens.length - trailingNum.consumed);
        if (searchPart.length > 0) {
            return { intent: { type: "set", value: trailingNum.value }, searchQuery: searchPart.join(" ") };
        }
    }

    // 6. Default: locate
    return { intent: { type: "locate" }, searchQuery: tokens.join(" ") };
}

/* ------------------------------------------------------------------ */
/* Item filtering (exact match only — no fuzzy for voice)               */
/* ------------------------------------------------------------------ */

function filterItems(items: PaletteItem[], query: string, intent: VoiceIntent): PaletteItem[] {
    if (!query) return [];

    const queryTokens = searchTokens(query);
    if (queryTokens.length === 0) return [];

    const actionsOnly = intent.type !== "locate";
    const analogOnly = intent.type === "set-open";

    return items.filter(item => {
        // Group filter
        if (actionsOnly && item.group !== "Actions") return false;
        if (!actionsOnly && item.group === "Actions") return false;

        // "execute" intent targets scenes only
        if (intent.type === "execute" && item.action.type !== "execute-scene") return false;

        // "set-open" targets analog popup items only
        if (analogOnly && !item.analogFallback) return false;

        // All query tokens must match the item's searchText
        return queryTokens.every(token => exactTokenMatch(token, item.searchText));
    });
}

/* ------------------------------------------------------------------ */
/* Action resolution                                                    */
/* ------------------------------------------------------------------ */

function resolveVoiceAction(item: PaletteItem, intent: VoiceIntent): VoiceCommandMatch {
    const name = item.label.replace(/^(Turn on |Turn off |Set |Activate scene |Clear )/, "");

    switch (intent.type) {
        case "on": {
            if (item.activateAction) {
                // TODO: Mi-Light and similar devices don't report state back — item.active
                // only reflects the last command UHN sent, not the physical truth. When these
                // resource types are added, skip the noop check for unreliable-state resources
                // (e.g. check a `stateReliable` flag on the item/resource).
                if (item.active) {
                    return { ...item, confirmLabel: `${name} \u2014 already on`, isNoOp: true };
                }
                return {
                    ...item,
                    action: { type: "send-command", ...item.activateAction },
                    confirmLabel: `Turn on ${name}`,
                };
            }
            // No activateAction — fallback to item's own action
            return { ...item, confirmLabel: item.label };
        }

        case "off": {
            if (item.deactivateAction) {
                if (!item.active) {
                    return { ...item, confirmLabel: `${name} \u2014 already off`, isNoOp: true };
                }
                return {
                    ...item,
                    action: { type: "send-command", ...item.deactivateAction },
                    confirmLabel: `Turn off ${name}`,
                };
            }
            return { ...item, confirmLabel: item.label };
        }

        case "toggle": {
            // Use the pre-computed state-based action (existing behavior)
            return { ...item, confirmLabel: item.label };
        }

        case "set": {
            // For analog items, send setAnalog with the specified value
            if (item.activateAction && item.activateAction.command.type === "setAnalog") {
                // Find the analog popup action to get min/max for clamping
                const analogAction = item.action.type === "open-analog-popup" ? item.action : undefined;
                const min = analogAction?.min ?? 0;
                const max = analogAction?.max ?? 100;
                const clamped = Math.max(min, Math.min(max, intent.value));
                const unit = analogAction?.unit ?? "%";
                return {
                    ...item,
                    action: {
                        type: "send-command",
                        resourceId: item.activateAction.resourceId,
                        command: { type: "setAnalog", value: clamped },
                    },
                    confirmLabel: `Set ${name} to ${clamped}${unit}`,
                };
            }
            // Non-analog item with set intent — fall through to toggle action
            return { ...item, confirmLabel: item.label };
        }

        case "set-open": {
            // "set <device>" without a number — open the analog popup
            return { ...item, confirmLabel: `Set ${name}` };
        }

        case "execute": {
            // Scenes — use existing action
            return { ...item, confirmLabel: item.label };
        }

        case "locate": {
            // Non-action items (scroll-to, navigate, etc.)
            return { ...item, confirmLabel: item.label };
        }
    }
}

/* ------------------------------------------------------------------ */
/* Bare command parsing (follow-up after locate)                        */
/* ------------------------------------------------------------------ */

/**
 * Parse a short transcript as a bare command — only matches command words
 * without any device name. Used after the user has already located an item
 * (e.g. "kitchen coffee socket") and now says a follow-up like "tap" or "on".
 *
 * Returns null if the transcript doesn't match any bare command pattern.
 */
export function parseBareCommand(transcript: string): BareCommand | null {
    // Strip punctuation — speech recognition often appends periods, commas, etc.
    const cleaned = transcript.replace(/[^\w\s-]/g, "");
    const tokens = searchTokens(cleaned);
    if (tokens.length === 0) return null;

    // Single word
    if (tokens.length === 1) {
        const w = tokens[0];
        if (ON_WORDS.has(w)) return { type: "on" };
        if (OFF_WORDS.has(w)) return { type: "off" };
        if (TOGGLE_WORDS.has(w)) return { type: "toggle" };
        if (EXECUTE_WORDS.has(w)) return { type: "execute" };
        // Bare "set" without a number — open analog popup
        if (COMMAND_PREFIXES.has(w)) return { type: "set-open" };
        // Bare number: "50", "fifty"
        const num = parseSpokenNumber(w);
        if (num != null) return { type: "set", value: num };
        return null;
    }

    // Two words
    if (tokens.length === 2) {
        const [first, second] = tokens;
        // "turn on" / "turn off" / "set on" / "set off"
        if (COMMAND_PREFIXES.has(first)) {
            if (ON_WORDS.has(second)) return { type: "on" };
            if (OFF_WORDS.has(second)) return { type: "off" };
            // "set 50" / "set fifty"
            const num = parseSpokenNumber(second);
            if (num != null) return { type: "set", value: num };
        }
        // Compound number: "twenty five"
        const num = parseSpokenNumber(tokens.join(" "));
        if (num != null) return { type: "set", value: num };
        return null;
    }

    // Three words: "set to 50", "set twenty five"
    if (tokens.length === 3) {
        const [first, , third] = tokens;
        if (COMMAND_PREFIXES.has(first)) {
            // "set to 50"
            const num1 = parseSpokenNumber(third);
            if (num1 != null) return { type: "set", value: num1 };
            // "set twenty five"
            const num2 = parseSpokenNumber(`${tokens[1]} ${third}`);
            if (num2 != null) return { type: "set", value: num2 };
        }
    }

    return null;
}

/**
 * Resolve a bare command against a previously highlighted item.
 *
 * Looks up Action-group items whose ID matches the highlighted item's
 * kind + refId, then applies the bare command intent.
 *
 * Returns null if no matching action item exists or the command doesn't apply.
 */
export function resolveHighlightedAction(
    bareCommand: BareCommand,
    highlightedKind: string,
    highlightedRefId: string,
    allItems: PaletteItem[],
): VoiceCommandMatch | null {
    // Match action items that belong to the highlighted item.
    // ID format: "action:<verb>:<kind>:<refId>:<locationId>"
    const matchKey = `:${highlightedKind}:${highlightedRefId}:`;
    const matchingActions = allItems.filter(
        item => item.group === "Actions" && item.id.includes(matchKey),
    );

    if (matchingActions.length === 0) return null;

    // Map bare command to a voice intent and pick the best candidate
    switch (bareCommand.type) {
        case "toggle": {
            const item = matchingActions.find(i => !i.analogFallback) ?? matchingActions[0];
            return resolveVoiceAction(item, { type: "toggle" });
        }
        case "on":
        case "off": {
            const item = matchingActions.find(i => !i.analogFallback) ?? matchingActions[0];
            return resolveVoiceAction(item, { type: bareCommand.type });
        }
        case "set": {
            // Prefer analog fallback entry (has min/max info for clamping)
            const item = matchingActions.find(i => i.analogFallback) ?? matchingActions[0];
            return resolveVoiceAction(item, { type: "set", value: bareCommand.value });
        }
        case "set-open": {
            // Open analog popup — only if the item has an analog fallback
            const item = matchingActions.find(i => i.analogFallback);
            if (!item) return null;
            return resolveVoiceAction(item, { type: "set-open" });
        }
        case "execute": {
            const item = matchingActions.find(i => i.action.type === "execute-scene") ?? matchingActions[0];
            return resolveVoiceAction(item, { type: "execute" });
        }
    }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Resolves a voice transcript into palette items with intent-aware actions.
 *
 * Unlike the text-based `useCommandPaletteFilter`, this uses:
 * - Intent parsing (on/off/toggle/set/execute/locate) instead of treating all text as search
 * - Exact token matching instead of fuzzy matching (speech gives real words, not typos)
 * - Action resolution matrix for idempotent commands and no-op detection
 */
export function useVoiceCommandResolver(
    transcript: string,
    allItems: PaletteItem[],
): { resolvedItems: VoiceCommandMatch[]; intent: VoiceIntent | null } {
    return useMemo(() => {
        if (!transcript.trim()) return { resolvedItems: [], intent: null };

        const { intent, searchQuery } = parseVoiceIntent(transcript);

        const matched = filterItems(allItems, searchQuery, intent);

        // For "set" intent, prefer analogFallback items (they have the min/max info)
        let candidates = matched;
        if (intent.type === "set") {
            const analogItems = matched.filter(item => item.analogFallback);
            if (analogItems.length > 0) candidates = analogItems;
        }

        // For on/off/toggle intents, prefer toggle entries over analogFallback
        if (intent.type === "on" || intent.type === "off" || intent.type === "toggle") {
            const toggleItems = matched.filter(item => !item.analogFallback);
            if (toggleItems.length > 0) candidates = toggleItems;
        }

        const resolvedItems = candidates.map(item => resolveVoiceAction(item, intent));

        return { resolvedItems, intent };
    }, [transcript, allItems]);
}
