import {
    AudioAppRequestMessage,
    AudiobookAuthorsResponse,
    AudiobookPartsResponse,
    LibraryAlbumsResponse,
    LibraryArtistsResponse,
    LibraryGetAlbumsSchema,
    LibraryGetTracksSchema,
    LibrarySearchResponse,
    LibrarySearchSchema,
    LibraryStatus,
    LibraryTrack,
    LibraryTracksResponse,
    SearchReachability,
    SpotifySearchResponse,
    SpotifySearchSchema,
} from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { listeningService } from "../audiobook/listening.service";
import { LibraryService, audiobookService, libraryService } from "../library/library.service";
import { bookProgressStore } from "../player/book-progress";
import { trackGainStore } from "../player/track-gain";
import { SEARCH_PAGE_SIZE, isSpotifyAlbumId, isSpotifyArtistId, SpotifyUnavailableError, spotifyCatalog, spotifyTrack } from "../player/spotify-catalog";
import { librarySearch } from "../search/library-search";
import { searchIndexer } from "../search/search-indexer";

const notFound = (what: string) => new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: `Unknown ${what}` });

const statusOf = (library: LibraryService): LibraryStatus => ({
    ...library.getStatus(),
    searchAvailable: searchIndexer.client !== undefined,
});

const getArtists = (library: LibraryService): LibraryArtistsResponse => ({ artists: library.getArtists(), status: statusOf(library) });

const getAlbums = (library: LibraryService, artistId: string): LibraryAlbumsResponse => {
    const artist = library.getArtist(artistId);
    if (!artist) {
        throw notFound("artist");
    }
    return { artist, albums: library.getAlbums(artist.id) };
};

const getTracks = (library: LibraryService, albumId: string): LibraryTracksResponse => {
    const album = library.getAlbum(albumId);
    const artist = album && library.getArtist(album.artistId);
    if (!album || !artist) {
        throw notFound("album");
    }
    return { artist, album, tracks: library.getTracks(album.id) };
};

/** The track with the gain it is played with, when it has one. Music only: the parts of a book have none. */
const withGain = (track: LibraryTrack): LibraryTrack => {
    const gainDb = trackGainStore.get(track.id);
    return gainDb === 0 ? track : { ...track, gainDb };
};

/** Asks Spotify; when it does not answer (fully) the client gets an error to show, not an empty or short list. */
const fromSpotify = async <T>(what: string, ask: () => Promise<T | undefined>): Promise<T> => {
    try {
        return (await ask()) ?? Promise.reject(notFound(what));
    } catch (error) {
        if (!(error instanceof SpotifyUnavailableError)) {
            throw error;
        }
        AppLogger.warn(undefined, { message: `[Spotify] ${error.message}` });
        throw new AppErrorV2({ statusCode: 503, code: ErrorCodes.INTERNAL_SERVER_ERROR, message: error.until ? `Spotify limits this until ${new Date(error.until).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}` : "Spotify does not answer, try again in a moment" });
    }
};

const scan = (library: LibraryService): LibraryStatus => {
    void library.scan();
    return statusOf(library);
};

export class LibraryHandler {
    @WebSocketAction("library_get_artists", { authenticate: true })
    public getArtists(): LibraryArtistsResponse {
        return getArtists(libraryService);
    }

    @WebSocketAction("library_get_albums", { authenticate: true, schema: LibraryGetAlbumsSchema })
    public async getAlbums(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_get_albums">): Promise<LibraryAlbumsResponse> {
        const { artistId } = message.payload;
        if (isSpotifyArtistId(artistId)) {
            return fromSpotify("artist", () => spotifyCatalog.getArtistAlbums(artistId));
        }
        return getAlbums(libraryService, artistId);
    }

    @WebSocketAction("library_get_tracks", { authenticate: true, schema: LibraryGetTracksSchema })
    public async getTracks(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_get_tracks">): Promise<LibraryTracksResponse> {
        const { albumId } = message.payload;
        if (isSpotifyAlbumId(albumId)) {
            return fromSpotify("album", () => spotifyCatalog.getAlbumTracks(albumId));
        }
        const answer = getTracks(libraryService, albumId);
        return { ...answer, tracks: answer.tracks.map(withGain) };
    }

    @WebSocketAction("search_check", { authenticate: true })
    public async searchCheck(): Promise<SearchReachability> {
        const client = searchIndexer.client;
        return { enabled: client !== undefined, reachable: client ? await client.health() : false };
    }

    /** Spotify's tracks (and artists and albums when asked for) for the same words; none when Spotify's search is not set up or does not answer, so that the library's hits stand alone. */
    @WebSocketAction("spotify_search", { authenticate: true, schema: SpotifySearchSchema })
    public async spotifySearch(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"spotify_search">): Promise<SpotifySearchResponse> {
        const { query, offset, types } = message.payload;
        const found = await spotifyCatalog.search(query.trim(), offset, types);
        // Only the tracks have a "more" button.
        return { query, tracks: found.tracks.map(spotifyTrack), artists: found.artists, albums: found.albums, hasMore: found.tracks.length === SEARCH_PAGE_SIZE };
    }

    @WebSocketAction("library_search", { authenticate: true, schema: LibrarySearchSchema })
    public async search(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_search">): Promise<LibrarySearchResponse> {
        const client = searchIndexer.client;
        if (!client) {
            throw new AppErrorV2({ statusCode: 503, code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "Search is not available" });
        }
        try {
            return await librarySearch(client, message.payload);
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] The search failed", error });
            throw new AppErrorV2({ statusCode: 503, code: ErrorCodes.INTERNAL_SERVER_ERROR, message: "Search is not available" });
        }
    }

    @WebSocketAction("library_scan", { authenticate: true })
    public scan(): LibraryStatus {
        return scan(libraryService);
    }

    @WebSocketAction("audiobook_get_authors", { authenticate: true })
    public getAuthors(): AudiobookAuthorsResponse {
        return { ...getArtists(audiobookService), continueListening: listeningService.continueListening() };
    }

    @WebSocketAction("audiobook_get_books", { authenticate: true, schema: LibraryGetAlbumsSchema })
    public getBooks(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"audiobook_get_books">): LibraryAlbumsResponse {
        return getAlbums(audiobookService, message.payload.artistId);
    }

    @WebSocketAction("audiobook_get_parts", { authenticate: true, schema: LibraryGetTracksSchema })
    public getParts(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"audiobook_get_parts">): AudiobookPartsResponse {
        const book = getTracks(audiobookService, message.payload.albumId);
        return { ...book, progress: bookProgressStore.get(book.album.id) };
    }

    @WebSocketAction("audiobook_scan", { authenticate: true })
    public scanBooks(): LibraryStatus {
        return scan(audiobookService);
    }
}
