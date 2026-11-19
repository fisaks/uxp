export interface ByteRange {
    start: number;
    end: number;
}

/** The bytes a Range header asks for (end inclusive), "unsatisfiable" when outside the file, undefined when there is no usable single range. */
export const parseByteRange = (header: string | undefined, size: number): ByteRange | "unsatisfiable" | undefined => {
    const match = header?.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (match[1] === "" && match[2] === "")) {
        return undefined;
    }
    let start: number;
    let end: number;
    if (match[1] === "") {
        // "-500" is the last 500 bytes
        start = Math.max(size - Number(match[2]), 0);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    }
    return start >= size || start > end ? "unsatisfiable" : { start, end };
};
