/** The play order of a queue of `length` tracks when shuffle is off: the order they were added in. */
export const sequentialOrder = (length: number): number[] => Array.from({ length }, (_, index) => index);

/**
 * A random play order of a queue of `length` tracks in which every track comes once and `first` comes first, so turning
 * shuffle on does not skip away from the track that is playing.
 */
export const shuffledOrder = (length: number, first?: number, random: () => number = Math.random): number[] => {
    const rest = sequentialOrder(length).filter((index) => index !== first);
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return first === undefined ? rest : [first, ...rest];
};
