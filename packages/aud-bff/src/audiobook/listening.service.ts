import { ContinueBook, MAX_CONTINUE_BOOKS } from "@aud/common";
import { audiobookService } from "../library/library.service";
import { bookProgressStore } from "../player/book-progress";

/** What the listening service needs of the audiobook library: the books it names. */
type Library = Pick<typeof audiobookService, "getAlbum" | "getArtist" | "getTracks">;
type Progress = Pick<typeof bookProgressStore, "byRecency">;

const secondsOf = (parts: { durationSec?: number }[]) => parts.reduce((sum, part) => sum + (part.durationSec ?? 0), 0);

/** Where the household is in the audiobooks: the library of the books together with the progress that is kept for them. */
export class ListeningService {
    constructor(
        private readonly library: Library,
        private readonly progress: Progress
    ) {}

    /** The books that were listened to last and are not finished. A book that has gone from the library is left out, and does not take a place. */
    continueListening(): ContinueBook[] {
        return this.progress
            .byRecency()
            .flatMap(({ albumId, progress }) => {
                const album = this.library.getAlbum(albumId);
                const artist = album && this.library.getArtist(album.artistId);
                if (!album || !artist) {
                    return [];
                }
                const parts = this.library.getTracks(albumId);
                const placeOfPart = Math.max(
                    0,
                    parts.findIndex((part) => part.id === progress.partId)
                );
                return [
                    {
                        album,
                        artist,
                        progress,
                        listenedSec: secondsOf(parts.slice(0, placeOfPart)) + progress.positionSec,
                        totalSec: secondsOf(parts),
                    },
                ];
            })
            .slice(0, MAX_CONTINUE_BOOKS);
    }
}

export const listeningService = new ListeningService(audiobookService, bookProgressStore);
