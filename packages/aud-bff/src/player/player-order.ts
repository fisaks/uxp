/**
 * A random order of `length` places in which every place comes once and `first` comes first, so mixing a queue does not
 * move away from the track that is playing. The result says which place of the queue goes where.
 */
export const shuffledOrder = (length: number, first?: number, random: () => number = Math.random): number[] => {
    const rest = Array.from({ length }, (_, index) => index).filter((index) => index !== first);
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return first === undefined ? rest : [first, ...rest];
};
