# VID Home Video Library

VID is the video remote app. It lists a folder of home videos, lets you label them in the browser and plays
them in the browser, in a separate player tab or on Chromecasts. Movies, TV series and children's films are
not built yet.

## Configuration (BFF environment)

| Variable | Required | Meaning |
|---|---|---|
| `JWT_SECRET` | yes | Verifies the login cookie. It is also the source of the key that signs stream links (see `casting.md`). |
| `VID_MEDIA_ROOT` | no | The folder that holds the media. The home videos are in its `HomeVideos` folder. Without it the library is empty. |
| `VID_DATA_DIR` | no | Where the BFF keeps what it can rebuild and its own state: scan result, poster frames, queues, groups, TV pairings. Without it the temporary folder is used and everything is lost when it is cleared. |
| `VID_PUBLIC_BASE_URL` | no | How a Chromecast reaches the BFF, with the port (`http://192.168.0.5:3051`). Without it casting is off. |
| `MEILI_URL`, `MEILI_API_KEY`, `MEILI_MASTER_KEY` | no | The shared search service, see `docs/uxp/platform-services.md`. Without `MEILI_URL` search is off and the search box is hidden. |

ffprobe and ffmpeg must be installed on the host.

## The files

- Only `.m4v` and `.mp4` files are listed, because those are what a browser and a Chromecast can play.
  Other formats are converted first (not built yet).
- Clips may be in sub folders. The date is read from the folder name, then from the file name
  (`2005_06_28`, `2009-03-26`, `2005_06_28-01.m4v`). A clip without a date in either has no date until you set one.
- A clip's `id` is the first 16 hex characters of the SHA-1 of its path inside the `HomeVideos` folder.
  Renaming or moving a file therefore makes it a new clip, and its labels stay behind in the metadata file.
- The folder is scanned when the BFF starts. There is no rescan: restart the BFF after adding files.
- The scan result (duration, size, width, height) is cached in `VID_DATA_DIR`. ffprobe runs only for files
  that are new or changed.
- Whether the moov atom is at the start or the end of the file makes no measurable difference to the start time,
  so files are not remuxed.

## Labels

Each clip has a title, a description, a date, people and tags. Place and event are tags. The date is a full
ISO date or empty, there are no partial dates.

- The labels are stored in `HomeVideos/home-video-metadata.json` in the media root, not in `VID_DATA_DIR`,
  so they are backed up with the videos and move with the drive. The file holds only what was edited.
- Writes are debounced (500 ms), atomic (temporary file and rename) and flushed on shutdown.
- The file is never written when it could not be read or when there is no media root, so an unmounted drive
  cannot wipe the labels.
- The UI saves a text field when it loses focus and a people or tags list at once, shows the change
  immediately and puts the old value back with a message when the server refuses.

## Poster frames

`GET /api/home-videos/clips/:id/thumbnail` returns a 320 px frame taken at 10 % of the clip, corrected for
anamorphic pixels, made by ffmpeg and cached in `VID_DATA_DIR`.

## Search

When `MEILI_URL` is set the clips are indexed in `vid_home_videos` (title, description, people, tags, date and
year, searched in that order). The index is replaced as a whole 1 s after a scan or a label change. In
development the BFF makes a scoped key for the index from the master key, elsewhere it uses `MEILI_API_KEY`.

`GET /api/home-videos/search?q=` returns the matching ids, best first, or 503 when search is off or failing.
The UI treats a failed search as no filter. The search box is in the top bar of every page and sends you to the
home video list with `?q=`, where it is combined with the list's own filters (year, person, tag, unlabelled).

## Pages

| Route (below the app's base path) | Page |
|---|---|
| `/` | Home: tiles for Home videos, Chromecasts, Playlists, Cast groups and one tile per player that is playing |
| `/home-videos` | The clips by year, with filters |
| `/home-videos/clips/:id` | One clip: video, previous and next, label form, cast picker |
| `/chromecasts`, `/playlists`, `/cast-groups` | See `casting.md`, `queues.md`, `groups.md` |
| `/player/:deviceId` | The player page of a Chromecast, a group or the player tab |
| `/player-window` | The player tab itself, see `player-tab.md` |


## API

All routes need the login cookie unless noted. Everything is below `/api`.

| Route | Purpose |
|---|---|
| `GET /status` | `mediaRootAvailable`, `searchAvailable` |
| `GET /home-videos/clips`, `GET .../clips/:id` | The clips with their labels |
| `PATCH /home-videos/clips/:id` | Partial label update |
| `GET /home-videos/labels` | People and tags in use, for the autocomplete |
| `GET /home-videos/search?q=` | See above |
| `GET /home-videos/clips/:id/thumbnail` | Poster frame |
| `POST /home-videos/clips/:id/stream-link` | A signed link for playing the clip |
| `GET /home-videos/stream/:id`, `GET /home-videos/poster/:id` | No login, signed link, see `casting.md` |
