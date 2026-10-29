# AUD playlists

Playlists are shared by everyone who uses the app (one set for the household, not per user). They are kept in
memory and in `playlists.json` in `AUD_DATA_DIR`; every change is written at once, one after the other, so a burst
of changes ends in the file with all of them. Without `AUD_DATA_DIR` they are only kept until the next restart.

## The file

```json
{
  "playlists": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Evening",
      "createdAt": "2026-10-29T20:00:00.000Z",
      "updatedAt": "2026-10-29T20:05:00.000Z",
      "tracks": [{ "id": "619f58111f62b769", "name": "Abba - Super Trouper" }]
    }
  ]
}
```

A track is its library id (a hash of its path, so it survives a rescan) and a name, "Artist - Title". The id is what
counts. The name is for whoever reads the file, and it is what is shown for a track that has gone from the library:
the track stays in the playlist as a missing entry (without `track`), is not counted in the length and is skipped
when the playlist is played, and it comes back by itself if the file returns. A file that cannot be read gives no
playlists, and entries of the wrong shape are skipped.

## What the UI can ask

| Action | Payload | Answer |
|--------|---------|--------|
| `playlist_list` | none | the playlists (id, name, number of tracks, length, updatedAt), sorted by name |
| `playlist_get` | `id` | the playlist with its entries; an entry has `track` (what the queue uses) unless it is missing |
| `playlist_create` | `name`, `trackIds` | the new playlist. The tracks may be none (an empty playlist) or the tracks of the queue. Tracks that are not in the library are left out. |
| `playlist_rename` | `id`, `name` | the playlist |
| `playlist_delete` | `id` | the playlists that are left |
| `playlist_add_tracks` | `id`, `trackIds` | the playlist, with the tracks added at the end (the same track may be there twice) |
| `playlist_remove_track` | `id`, `index` | the playlist |
| `playlist_move_track` | `id`, `from`, `to` | the playlist; the track at `from` goes to `to` and the others move over |

A name is 1 to 100 characters after it is trimmed. An unknown playlist gives `NOT_FOUND`, a place that is not in the
playlist or a bad name `VALIDATION`.

There is no action for playing a playlist: the UI has its tracks and uses `player_play_tracks` (with `startIndex`)
or `player_enqueue`, with the ids of the entries that have a `track`.
