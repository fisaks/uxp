/* ------------------------------------------------------------------ */
/* Damerau-Levenshtein distance Optimal String Alignment (OSA) variant (edits: insert, delete, replace, swap) */
/* ------------------------------------------------------------------ */

function damerauLevenshtein(a: string, b: string): number {
    const la = a.length;
    const lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;

    /* d[i][j] = distance between a[0..i-1] and b[0..j-1]
    /* For a = "ktichen", b = "kitchen":
    /*      ""  k  i  t  c  h  e  n
    /*  ""   0  1  2  3  4  5  6  7
    /*  k    1  
    /*  t    2
    /*  i    3
    /*  c    4
    /*  h    5
    /*  e    6
    /*  n    7
    */
    const d: number[][] = Array.from({ length: la + 1 }, () => new Array<number>(lb + 1));
    for (let i = 0; i <= la; i++) d[i][0] = i;
    for (let j = 1; j <= lb; j++) d[0][j] = j;

    for (let i = 1; i <= la; i++) {
        for (let j = 1; j <= lb; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,       // deletion
                d[i][j - 1] + 1,       // insertion
                d[i - 1][j - 1] + cost, // substitution
            );
            // transposition
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    /*
    completed matrix for a = "ktichen", b = "kitchen":                                                                                                                                                                                                                                                 

            ""  k  i  t  c  h  e  n                                                                                                                                                                                                                                                                             
      ""     0  1  2  3  4  5  6  7                                                                                                                                                                                                                                                                             
      k      1  0  1  2  3  4  5  6                                                                                                                                                                                                                                                                             
      t      2  1  1  1  2  3  4  5                                                                                                                                                                                                                                                                             
      i      3  2  1 [1] 2  3  4  5                                                                                                                                                                                                                                                                             
      c      4  3  2  2  1  2  3  4                                                                                                                                                                                                                                                                             
      h      5  4  3  3  2  1  2  3                                                                                                                                                                                                                                                                             
      e      6  5  4  4  3  2  1  2
      n      7  6  5  5  4  3  2  1
    */
    return d[la][lb];
}

/** Maximum allowed edit distance for a token of given length. */
function maxDistance(tokenLength: number): number {
    if (tokenLength <= 2) return 0; // too short for fuzzy
    return Math.floor(tokenLength / 3);
}

/**
 * Check if a search token fuzzy-matches any word in the text.
 * Returns true if the token is an exact substring OR within the
 * allowed edit distance of any word in the text.
 *
 * Uses Damerau-Levenshtein distance which counts transpositions
 * (swapped adjacent characters) as a single edit, alongside
 * insertions, deletions, and substitutions.
 *
 * The allowed distance scales with token length: floor(length / 3).
 * Tokens of 1-2 characters require an exact substring match.
 */
export function fuzzyTokenMatch(token: string, text: string): boolean {
    // Fast path: exact substring match
    if (text.includes(token)) return true;

    const maxDist = maxDistance(token.length);
    if (maxDist === 0) return false;

    const words = text.split(/\s+/);
    for (const word of words) {
        // Skip words that differ too much in length to ever match
        if (Math.abs(word.length - token.length) > maxDist) continue;
        if (damerauLevenshtein(token, word) <= maxDist) return true;
    }
    return false;
}
