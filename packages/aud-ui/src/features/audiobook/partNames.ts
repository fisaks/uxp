import { LibraryTrack } from "@aud/common";

/** "Part 3", with the disc in front when the book has several: "Disc 2 · Part 3". A book of one file is "Whole book". */
export const partNames = (parts: LibraryTrack[]): string[] => {
    if (parts.length === 1) return ["Whole book"];
    const discs = [...new Set(parts.map((part) => part.discNo))];
    return parts.map((part) => {
        const sameDisc = parts.filter((other) => other.discNo === part.discNo);
        const name = `Part ${sameDisc.indexOf(part) + 1}`;
        return discs.length > 1 && part.discNo !== undefined ? `Disc ${part.discNo} · ${name}` : name;
    });
};
