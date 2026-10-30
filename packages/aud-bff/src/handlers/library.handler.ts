import {
    AudioAppRequestMessage,
    AudiobookPartsResponse,
    LibraryAlbumsResponse,
    LibraryArtistsResponse,
    LibraryGetAlbumsSchema,
    LibraryGetTracksSchema,
    LibraryStatus,
    LibraryTracksResponse,
} from "@aud/common";
import { AppErrorV2, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { LibraryService, audiobookService, libraryService } from "../library/library.service";
import { bookProgressStore } from "../player/book-progress";

const notFound = (what: string) => new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: `Unknown ${what}` });

const getArtists = (library: LibraryService): LibraryArtistsResponse => ({ artists: library.getArtists(), status: library.getStatus() });

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
    return library.getStatus();
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

    @WebSocketAction("library_scan", { authenticate: true })
    public scan(): LibraryStatus {
        return scan(libraryService);
    }

    @WebSocketAction("audiobook_get_authors", { authenticate: true })
    public getAuthors(): LibraryArtistsResponse {
        return getArtists(audiobookService);
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
