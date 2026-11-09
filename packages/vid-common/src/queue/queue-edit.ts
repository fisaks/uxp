import { CastQueue, CastQueueRequest } from "../types/cast.type";

/** The index that plays after the current one: the first again when the queue repeats, undefined at the end of one that does not. */
export const nextIndex = (queue: CastQueue): number | undefined => {
    if (queue.index + 1 < queue.clipIds.length) {
        return queue.index + 1;
    }
    return queue.repeat && queue.clipIds.length > 0 ? 0 : undefined;
};

/** What a queue edit asks for that the queue cannot do: an index that is not in it. */
export class QueueEditError extends Error {}

const checkIndex = (queue: CastQueue, index: number) => {
    if (index < 0 || index >= queue.clipIds.length) {
        throw new QueueEditError("There is no such place in the queue");
    }
};

/**
 * Edits the queue of an action other than `replace`, and says whether the clip that plays changed, so that it has to be started
 * again. A queue that ends up empty has nothing to play.
 */
export const editQueue = (queue: CastQueue, request: CastQueueRequest): { playChanged: boolean } => {
    switch (request.action) {
        case "next":
            queue.clipIds.splice(queue.index + 1, 0, ...request.clipIds);
            return { playChanged: false };
        case "append":
            queue.clipIds.push(...request.clipIds);
            return { playChanged: false };
        case "remove": {
            checkIndex(queue, request.index);
            queue.clipIds.splice(request.index, 1);
            if (request.index < queue.index) {
                queue.index--;
                return { playChanged: false };
            }
            // What slides into the place of the removed clip plays now, or the queue starts over when it was the last.
            const removedPlaying = request.index === queue.index;
            if (removedPlaying && queue.index >= queue.clipIds.length) {
                queue.index = 0;
            }
            return { playChanged: removedPlaying };
        }
        case "move": {
            checkIndex(queue, request.from);
            checkIndex(queue, request.to);
            const [clipId] = queue.clipIds.splice(request.from, 1);
            queue.clipIds.splice(request.to, 0, clipId);
            if (request.from === queue.index) {
                queue.index = request.to;
            } else if (request.from < queue.index && request.to >= queue.index) {
                queue.index--;
            } else if (request.from > queue.index && request.to <= queue.index) {
                queue.index++;
            }
            return { playChanged: false };
        }
        case "jump":
            checkIndex(queue, request.index);
            queue.index = request.index;
            return { playChanged: true };
        case "repeat":
            queue.repeat = request.repeat;
            return { playChanged: false };
        case "replace":
            throw new QueueEditError("A replace is not an edit");
    }
};
