// These will spread the bits well enough for our purposes
const OFFSET_BASE_32 = 0x811c9dc5; // 2166136261  binary 10000001000111001001110111000101
const PRIME_32 = 0x01000193; // 16777619 binary 00000001000000000000000110010011
export function fnv1a(str: string): string {
    let hash = OFFSET_BASE_32;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, PRIME_32);  //Math.imul ensures correct 32-bit integer math
    }

    //JavaScript numbers are:
    //64-bit floating point
    //but bitwise operations operate on signed 32-bit integers
    //hash >>> 0 forces JavaScript to treat the number as unsigned 32-bit
    //.toString(16) — convert to hexadecimal -> eg 4026120564 → "f00f2c34"
    //.padStart(8, "0") — guarantees the result is exactly 8 hex characters.
    return (hash >>> 0).toString(16).padStart(8, "0");
}