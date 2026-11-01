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
    LibraryTracksResponse,
    SearchReachability,
} from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { listeningService } from "../audiobook/listening.service";
import { LibraryService, audiobookService, libraryService } from "../library/library.service";
import { bookProgressStore } from "../player/book-progress";
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
    public getAlbums(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_get_albums">): LibraryAlbumsResponse {
        return getAlbums(libraryService, message.payload.artistId);
    }

    @WebSocketAction("library_get_tracks", { authenticate: true, schema: LibraryGetTracksSchema })
    public getTracks(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_get_tracks">): LibraryTracksResponse {
        return getTracks(libraryService, message.payload.albumId);
    }

    @WebSocketAction("search_check", { authenticate: true })
    public async searchCheck(): Promise<SearchReachability> {
        const client = searchIndexer.client;
        return { enabled: client !== undefined, reachable: client ? await client.health() : false };
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
