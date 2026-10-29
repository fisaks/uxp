# AUD music library

The music library is built from the files of one folder, the music root. The files are the truth: the library is
kept in memory and can be rebuilt from them at any time.

## Configuration (BFF environment)

| Variable         | Required | Meaning                                                                                       |
| ---------------- | -------- | --------------------------------------------------------------------------------------------- |
| `AUD_MUSIC_ROOT` | no       | The folder with the music. Without it the library is empty.                                   |
| `AUD_DATA_DIR`   | no       | Where aud keeps its data: the cache of the scan (`library.json`) and the queue (`queue.json`, see `player.md`) and the playlists (`playlists.json`, see `playlists.md`). Without it every start scans all files, and the queue and the playlists are lost at a restart. |

## Folder layout

```
<music root>/Artist/Album/01 Title.mp3
<music root>/Artist/Album/Disc 1/01 Title.wma     (any depth below the album folder)
<music root>/Artist/Album/Folder.jpg              (the cover)
```

- **Artist and album** are the first two folders, not the tags. Compilations are kept together under
  `Various Artists`; the artist of a track (from its tags) is shown per track. A file higher up gets the
  placeholders "Unknown artist" and "Unknown album".
- **Tracks** are `.mp3` and `.wma` files. Everything else, such as video files or `.m3u` playlists, is ignored.
  Title, track number, disc number, year and duration come from the tags. When the tags have no title or track
  number they come from the file name (`01 - Title.mp3`); a disc number can also come from a folder named
  `Disc 1` or `CD2`.
- **Cover:** a picture in the album folder goes before one in a subfolder (such as `Artwork`). Among pictures
  of the same depth the names are tried in this order: `folder`, `cover`, `front`, names with `large`, names with
  `small`, then any other picture. Pictures named like a back, disc or inlay picture are only used when nothing
  else is there.
- **Ids** are a hash of the path below the music root, so they are the same on every machine and stay the same
  between scans.

## How it works

- `scanLibrary` (`aud-bff/src/library/library-scanner.ts`) walks the folders and reads the tags with
  `music-metadata` (pure JavaScript), three files at a time. A file with the same size and modification time as
  in the previous scan is not read again. A file whose tags cannot be read stays in the library, named after
  the file, and is logged.
- `LibraryService` keeps the artists, albums and tracks in memory and writes the scan, pretty printed so it can be read, to `library.json` in
  `AUD_DATA_DIR`. After a restart the cache is loaded at once and a scan then looks for changes in the
  background. Deleting the cache is safe.
- A scan that is running is not started a second time.

## What the UI can ask

| Action | Payload | Answer |
|--------|---------|--------|
| `library_get_artists` | none | the artists and the status (`scanning`, `scannedAt`, `trackCount`) |
| `library_get_albums` | `artistId` | the artist and its albums |
| `library_get_tracks` | `albumId` | the artist, the album and its tracks |
| `library_scan` | none | the status; a scan starts in the background if none is running |

An unknown artist or album gives `NOT_FOUND`. The cover picture of an album is served at
`GET /api/cover/:albumId` (needs the login cookie, cached by the browser for a day); an album without a cover gives
404 and the UI shows a record icon. The files are never served by path, only the cover the scanner picked.

The UI (`aud-ui/src/features/library`) has three views under the Library tab: the artists with a filter and a
rescan button, the albums of an artist as a cover grid, and the tracks of an album (grouped by disc when there
is more than one). While a scan runs, the artists view asks again every 3 seconds.
