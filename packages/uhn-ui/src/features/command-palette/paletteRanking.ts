import { PaletteItem } from "./commandPalette.types";

/** Verb the action labels start with ("Turn on Kitchen Light", "Set Dimmer"), which says nothing about the name. */
const LABEL_VERB = /^(turn on |turn off |toggle |set |clear |activate scene |expand |collapse )/;

const labelWords = (label: string): string[] =>
    label.toLowerCase().replace(LABEL_VERB, "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * How well an item's label answers the query, lower is better:
 * 0 the label is the query ("cinema" for the location Cinema),
 * 1 the label starts with the query ("cinema" for Cinema Corridor),
 * 2 every query word is a whole word of the label,
 * 3 anything else that matched (the words are only in the search text, or only a fuzzy match).
 */
function labelRank(words: string[], tokens: string[]): number {
    if (words.length === tokens.length && tokens.every((token, i) => words[i] === token)) return 0;
    if (tokens.every((token, i) => words[i] === token)) return 1;
    if (tokens.every(token => words.includes(token))) return 2;
    return 3;
}

/**
 * Orders matched items so the best answer comes first: by label rank, then by fewer words in the label (Cinema before
 * Cinema Corridor when both are a prefix match), then in the original order. The typed palette and the voice
 * commands both use it, so the same words pick the same item.
 */
export function rankPaletteItems<T extends PaletteItem>(items: T[], tokens: string[]): T[] {
    return items
        .map((item, index) => {
            const words = labelWords(item.label);
            return { item, index, rank: labelRank(words, tokens), length: words.length };
        })
        .sort((a, b) => a.rank - b.rank || (a.rank < 3 ? a.length - b.length : 0) || a.index - b.index)
        .map(({ item }) => item);
}
