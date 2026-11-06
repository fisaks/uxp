import { WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { AmplifierReachability, AmplifierState } from "./amplifier.type";
import { PlayerState, RepeatMode, SpotifyHealth } from "./player.type";
import { HistoryResponse } from "./history.type";
import { LibrarySearchRequest, LibrarySearchResponse, SearchReachability, SpotifySearchRequest, SpotifySearchResponse } from "./search.type";
import { Playlist, PlaylistSummary } from "./playlist.type";
import {
    AudiobookAuthorsResponse,
    AudiobookPartsResponse,
    LibraryAlbumsResponse,
    LibraryArtistsResponse,
    LibraryStatus,
    LibraryTracksResponse,
} from "./library.type";

export type AudioAppActionPayloadRequestMap = {
    /** Starts the live amplifier updates. The response is the current state. */
    amplifier_subscribe: Record<string, never>;
    /** Asks once whether the amplifier answers, for the health check. It does not start the live updates. */
    amplifier_check: Record<string, never>;
    /** Starts the messages that say the library or the playlists have changed, so a client can ask again. */
    content_subscribe: Record<string, never>;
    /** The plays that counted, and the queues that were replaced, for the History tab. */
    history_get: Record<string, never>;
    /** Forgets the plays and the previous queues. */
    history_clear: Record<string, never>;
    playlist_list: Record<string, never>;
    playlist_get: { id: string };
    /** Makes a playlist of these tracks, for example of the queue. The tracks may be none: an empty playlist. */
    playlist_create: { name: string; trackIds: string[] };
    playlist_rename: { id: string; name: string };
    playlist_delete: { id: string };
    /** Adds tracks to the end of the playlist. */
    playlist_add_tracks: { id: string; trackIds: string[] };
    playlist_remove_track: { id: string; index: number };
    /** Moves the track at `from` to `to`, the others move over. */
    playlist_move_track: { id: string; from: number; to: number };
    library_get_artists: Record<string, never>;
    library_get_albums: { artistId: string };
    library_get_tracks: { albumId: string };
    /** Searches music, books and playlists at once. */
    library_search: LibrarySearchRequest;
    /** Searches the tracks of Spotify, which are not in the library: asked for apart, since Spotify answers slower than the library. */
    spotify_search: SpotifySearchRequest;
    /** Asks once whether search is on and Meilisearch answers, for the health check. */
    search_check: Record<string, never>;
    /** Asks once whether Spotify is set up and its player answers, and how long its build lasts, for the health check. */
    spotify_check: Record<string, never>;
    /** The audiobooks have the same shape as the music: authors are artists, books are albums and parts are tracks. */
    audiobook_get_authors: Record<string, never>;
    audiobook_get_books: { artistId: string };
    audiobook_get_parts: { albumId: string };
    /** Scans the audiobook folder again. */
    audiobook_scan: Record<string, never>;
    /** Scans the music folder again. The response is the status, which has `scanning: true` until it is done. */
    library_scan: Record<string, never>;
    /** Starts the live player updates. The response is the current state. */
    player_subscribe: Record<string, never>;
    /** Replaces the queue with these tracks and starts with the one at `startIndex` (the first by default). */
    player_play_tracks: { trackIds: string[]; startIndex?: number; shuffle?: boolean; playlistId?: string };
    /** Replaces the queue with the parts of a book. It starts where the listening was left, or at the start of `partId`. */
    player_play_book: { albumId: string; partId?: string };
    /** Adds tracks to the end of the queue. */
    player_enqueue: { trackIds: string[] };
    /** Puts tracks in the queue right after the current track. */
    player_play_next: { trackIds: string[] };
    /** Tracks that Spotify plays or has coming are put in the queue, after the current track when `next` is true. */
    player_enqueue_spotify: { uris: string[]; next?: boolean };
    /** Plays a track now: it goes right after the current track and starts, and the rest of the queue goes on after it. */
    player_play_now: { trackId: string };
    /** Brings back the queue that the last replacing or clearing of the queue took away. */
    player_undo_queue: Record<string, never>;
    /** Plays the track at this place of the queue. */
    player_play_index: { index: number };
    player_remove: { index: number };
    /** Moves the track at `from` of the queue to `to`, the others move over. What is playing keeps playing. */
    player_move: { from: number; to: number };
    player_clear: Record<string, never>;
    player_pause: Record<string, never>;
    player_resume: Record<string, never>;
    /** Plays the queue on from where it was paused, and pauses Spotify. */
    player_resume_queue: Record<string, never>;
    /** Plays Spotify on from where it was paused, and pauses the queue. */
    player_resume_spotify: Record<string, never>;
    player_next: Record<string, never>;
    /** Plays the previous track, or the current one again when it has played for more than a few seconds. */
    player_previous: Record<string, never>;
    player_seek: { positionSec: number };
    player_set_shuffle: { on: boolean };
    player_set_repeat: { mode: RepeatMode };
    player_set_speed: { rate: number };
    /** Sets the gain of the track that is playing, which is kept for that track. */
    player_set_gain: { gainDb: number };
    /** Sets the gain of songs of the library, such as the songs of an album, and keeps it for each of them. */
    player_set_tracks_gain: { trackIds: string[]; gainDb: number };
    amplifier_set_power: { on: boolean };
    amplifier_set_volume: { volumeDb: number };
    amplifier_set_mute: { muted: boolean };
    amplifier_set_input: { input: string };
    amplifier_set_sound_program: { program: string };
    amplifier_set_straight: { on: boolean };
    amplifier_set_enhancer: { on: boolean };
    amplifier_set_tuner_frequency: { frequency: number };
    amplifier_set_sleep: { minutes: number };
    amplifier_set_bass: { db: number };
    amplifier_set_treble: { db: number };
    amplifier_set_subwoofer_trim: { db: number };
    amplifier_set_pure_direct: { on: boolean };
    amplifier_set_adaptive_drc: { on: boolean };
    amplifier_set_cinema_dsp_3d: { on: boolean };
    amplifier_set_dialogue_level: { level: number };
    amplifier_set_dialogue_lift: { level: number };
};

export type AudioAppActionPayloadResponseMap = {
    amplifier_subscribe: AmplifierState;
    amplifier_check: AmplifierReachability;
    /** Pushed to subscribers whenever the amplifier state changes. */
    amplifier_state: AmplifierState;
    content_subscribe: Record<string, never>;
    /** Pushed to subscribers when a scan has changed the library. */
    library_changed: Record<string, never>;
    /** Pushed to subscribers when a playlist has been made, changed or deleted. */
    playlists_changed: Record<string, never>;
    /** Pushed to subscribers when a track has counted as played, or a queue has been kept. */
    history_changed: Record<string, never>;
    history_get: HistoryResponse;
    history_clear: HistoryResponse;
    playlist_list: PlaylistSummary[];
    playlist_get: Playlist;
    playlist_create: Playlist;
    playlist_rename: Playlist;
    /** The playlists that are left. */
    playlist_delete: PlaylistSummary[];
    playlist_add_tracks: Playlist;
    playlist_remove_track: Playlist;
    playlist_move_track: Playlist;
    library_get_artists: LibraryArtistsResponse;
    library_get_albums: LibraryAlbumsResponse;
    library_get_tracks: LibraryTracksResponse;
    library_search: LibrarySearchResponse;
    spotify_search: SpotifySearchResponse;
    search_check: SearchReachability;
    spotify_check: SpotifyHealth;
    audiobook_get_authors: AudiobookAuthorsResponse;
    audiobook_get_books: LibraryAlbumsResponse;
    audiobook_get_parts: AudiobookPartsResponse;
    audiobook_scan: LibraryStatus;
    library_scan: LibraryStatus;
    player_subscribe: PlayerState;
    /** Pushed to subscribers whenever the player changes, not every second: see `PlayerState.positionSec`. */
    player_state: PlayerState;
    /** Pushed every few seconds while playing, so a client that moves the position on by itself is corrected. */
    player_position: { positionSec: number };
    player_play_tracks: PlayerState;
    player_play_book: PlayerState;
    player_enqueue: PlayerState;
    player_play_next: PlayerState;
    player_enqueue_spotify: PlayerState;
    player_play_now: PlayerState;
    player_undo_queue: PlayerState;
    player_play_index: PlayerState;
    player_remove: PlayerState;
    player_move: PlayerState;
    player_clear: PlayerState;
    player_pause: PlayerState;
    player_resume: PlayerState;
    player_resume_queue: PlayerState;
    player_resume_spotify: PlayerState;
    player_next: PlayerState;
    player_previous: PlayerState;
    player_seek: PlayerState;
    player_set_shuffle: PlayerState;
    player_set_repeat: PlayerState;
    player_set_speed: PlayerState;
    player_set_gain: PlayerState;
    player_set_tracks_gain: PlayerState;
    amplifier_set_power: AmplifierState;
    amplifier_set_volume: AmplifierState;
    amplifier_set_mute: AmplifierState;
    amplifier_set_input: AmplifierState;
    amplifier_set_sound_program: AmplifierState;
    amplifier_set_straight: AmplifierState;
    amplifier_set_enhancer: AmplifierState;
    amplifier_set_tuner_frequency: AmplifierState;
    amplifier_set_sleep: AmplifierState;
    amplifier_set_bass: AmplifierState;
    amplifier_set_treble: AmplifierState;
    amplifier_set_subwoofer_trim: AmplifierState;
    amplifier_set_pure_direct: AmplifierState;
    amplifier_set_adaptive_drc: AmplifierState;
    amplifier_set_cinema_dsp_3d: AmplifierState;
    amplifier_set_dialogue_level: AmplifierState;
    amplifier_set_dialogue_lift: AmplifierState;
};

export type AudioAppRequestMessage<Action extends WebSocketAction<AudioAppActionPayloadRequestMap>> = WebSocketMessage<
    Action,
    AudioAppActionPayloadRequestMap
>;
export type AudioAppResponseMessage<Action extends WebSocketAction<AudioAppActionPayloadResponseMap>> = WebSocketResponse<
    Action,
    AudioAppActionPayloadResponseMap
>;
