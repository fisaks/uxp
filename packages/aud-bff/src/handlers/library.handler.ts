import {
    AudioAppRequestMessage,
    LibraryAlbumsResponse,
    LibraryArtistsResponse,
    LibraryGetAlbumsSchema,
    LibraryGetTracksSchema,
    LibraryStatus,
    LibraryTracksResponse,
} from "@aud/common";
import { AppErrorV2, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { libraryService } from "../library/library.service";

const notFound = (what: string) => new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: `Unknown ${what}` });

export class LibraryHandler {
    @WebSocketAction("library_get_artists", { authenticate: true })
    public getArtists(): LibraryArtistsResponse {
        return { artists: libraryService.getArtists(), status: libraryService.getStatus() };
    }

    @WebSocketAction("library_get_albums", { authenticate: true, schema: LibraryGetAlbumsSchema })
    public getAlbums(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_get_albums">): LibraryAlbumsResponse {
        const artist = libraryService.getArtist(message.payload.artistId);
        if (!artist) {
            throw notFound("artist");
        }
        return { artist, albums: libraryService.getAlbums(artist.id) };
    }

    @WebSocketAction("library_get_tracks", { authenticate: true, schema: LibraryGetTracksSchema })
    public getTracks(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"library_get_tracks">): LibraryTracksResponse {
        const album = libraryService.getAlbum(message.payload.albumId);
        const artist = album && libraryService.getArtist(album.artistId);
        if (!album || !artist) {
            throw notFound("album");
        }
        return { artist, album, tracks: libraryService.getTracks(album.id) };
    }

    @WebSocketAction("library_scan", { authenticate: true })
    public scan(): LibraryStatus {
        void libraryService.scan();
        return libraryService.getStatus();
    }
}
