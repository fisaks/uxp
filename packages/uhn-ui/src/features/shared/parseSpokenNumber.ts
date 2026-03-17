/** Common spoken number words. */
const numberWords: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100,
};

/**
 * Extract a number from a spoken transcript.
 * Handles both digit forms ("90") and common spoken forms ("fifty", "twenty five").
 *
 * When `text` contains multiple number words they are accumulated:
 * - "twenty five" → 25,  "two hundred" → 200
 *
 * Returns `null` when no number is found.
 */
export function parseSpokenNumber(text: string): number | null {
    // Try direct numeric parse first (handles "90", "75", "50.5")
    const directMatch = text.match(/\b(-?\d+(?:\.\d+)?)\b/);
    if (directMatch) return parseFloat(directMatch[1]);

    const words = text.split(/[\s-]+/);
    let total = 0;
    let found = false;

    for (const word of words) {
        const val = numberWords[word];
        if (val != null) {
            if (val === 100 && found) {
                // "two hundred" = 2 * 100
                total *= 100;
            } else {
                total += val;
            }
            found = true;
        }
    }

    return found ? total : null;
}
