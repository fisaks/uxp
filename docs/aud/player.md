# AUD player

The player plays the tracks of the music library on the machine where the AUD backend runs (on the music Pi, the
analog output that goes into the amplifier). There is one queue and one player, shared by every browser.

## Configuration (BFF environment)

| Variable | Required | Meaning |
|----------|----------|---------|
| `AUD_PLAYER` | no | `mpv` (default) or `mplayer` play the music. `fake` only counts the time of the tracks, for development without speakers. |
| `AUD_MPV_COMMAND` | no | The mpv program, `mpv` by default. |
| `AUD_MPV_AUDIO_DEVICE` | no | The audio output of mpv, as listed by `mpv --audio-device=help`, for example `alsa/plughw:0,0`. mpv chooses when not set. |
| `AUD_MPLAYER_COMMAND` | no | The mplayer program, `mplayer` by default. |
| `AUD_MPLAYER_AUDIO_OUTPUT` | no | The audio output of mplayer, the value of its `-ao` option, for example `alsa:device=hw=0.0`. mplayer chooses when not set. |

The user the backend runs as needs access to the sound device (on Raspberry Pi OS: the `audio` group), and the program
of the chosen engine must be installed.

## How it works

- `PlayerService` (`aud-bff/src/player/player.service.ts`) owns the queue and what is playing. It does not make
  sound itself: an engine does, behind the `PlayerEngine` interface (`MpvPlayerEngine`, `FakePlayerEngine`).
- The **queue** is the order the tracks are played in, and what the Queue tab shows is what plays: Next is the track
  below the current one, Previous the one above, and dragging a track changes when it plays. There is no separate
  hidden play order.
- **Shuffle** mixes the queue: the current track stays at the top and the rest is mixed. The queue as it was before is
  kept, and turning shuffle off brings it back with the current track kept. While shuffle is on, tracks that are added
  come last (mixed among themselves) and are also added to the kept order, a removed track is removed from both, and
  what is played (`play_tracks`) is mixed with the chosen track first. Dragging a track in a mixed queue only changes
  the mixed queue.
- **Repeat** is `off` (stop after the last track, ready at the start of the queue), `all` (start again) or `one`
  (the same track again). Next and Previous ignore `one`.
- **Previous** plays the track again when it has played for more than 3 seconds, otherwise the one before.
- A track whose file is missing or that mpv cannot play is skipped. When every track of the queue fails one after the
  other the player stops.
- The queue is kept when the backend restarts: it is saved to `queue.json` in `AUD_DATA_DIR` a moment after it
  changes (the tracks in the order they play, each as its id, its collection (`music` or `audiobooks`, music when missing) and a name "Artist - Title" that is only there to be read,
  the place of the current track, shuffle and repeat, and while shuffle is on the order of before as places in the
  tracks; not the position and not every position update). At the next start it is brought back once the library has been read, stopped and ready to
  play from the start of the current track. Tracks that have gone from the library are left out, and a current track that
  is gone gives way to the next one. While the library is empty (before the first scan) nothing is restored and the saved
  queue is not overwritten.

## What the UI does

Clients subscribe once (`player_subscribe`) and get `player_state` whenever the player changes. The state carries the
position of the current track at the time it was sent, and the UI moves it on from the time it received it, so
the server does not send a state every second. While playing, the server also sends the real position of the sound every 2 seconds (`player_position`, a few
bytes) so the moving position cannot drift from the sound, for example when a file is slow to start or a seek lands
a little off. The commands are the other `player_*` actions: `play_tracks`
(replaces the queue; `shuffle` turns shuffle on or off for the new queue), `play_book` (replaces the queue with a book, see
Audiobooks), `enqueue`, `play_index`, `remove`, `clear`, `pause`, `resume`, `next`, `previous`, `seek`,
`set_shuffle` and `set_repeat`. Each answers with the new state. `play_next` puts tracks right after the
current one, `play_now` plays a track without losing the queue (it goes right after the current track, starts, and the
queue goes on after it), and `undo_queue` brings back the queue that the last replacing (`play_tracks`) or clearing of
the queue took away (as it was, with its current track, and playing again if it was playing; there is only one, and it is
kept in memory only). `move` (`from`, `to`) moves a track of the queue,
the others move over, and what is playing keeps playing (and what follows it is what the queue shows after it).

The now playing bar is at the bottom of every page of the app while the queue has tracks; the Queue tab lists
the queue. While the queue is an audiobook, the bar shows the book title with the part and the author under it, and has no
shuffle and repeat buttons, and the Queue tab lists the parts without drag handles, Remove or Save as playlist (see
Audiobooks). In the album view:

- An album can be played or shuffled (both replace the queue), added to the queue or put in a playlist.
- A track row has a **+** that adds it to the queue (one tap, with a message), and a menu with Play next, Add to the playlist
  that was changed last, Add to a playlist (a dialog, the playlists changed most recently first) and Play album from here.
- **Pressing a track** plays the album from that track when the queue is empty. When there is a queue the track is played
  now and the queue is kept, so nothing is lost.
- Whenever the queue that had tracks is replaced (an album, a playlist, Play album from here) or cleared, a message
  "Queue replaced" or "Queue cleared" has an Undo for a few seconds (`undo_queue`).
- Messages (what was added, Undo, and errors) are a coloured strip in the column of the app right above the player bar,
  not a pop up at the edge of the window, which is far from the controls on a wide screen.

## Starting

The status of the player is `stopped`, `starting`, `playing` or `paused`. `starting` is from the moment the user asks
for music until the sound is there: the amplifier may be starting up, mplayer may be starting (on the Pi it takes
a couple of seconds the first time) and the file loading. The answer to Play is the state at once, with the status
`starting`, and the rest happens in the background and reaches the clients as updates. The player moves on to `playing`
at the first position the engine reports, and only then does the position move in the UI. Until then the position
slider is disabled, and the bar shows "Loading..." and a spinner instead of the pause button (pressing it cancels).

- Pause (or Clear, Next, or another Play) while it is starting overrides the start that waits: pausing before the
  engine has the file cancels, so the player is stopped and Play starts the track again.
- The next track of a queue that plays also goes through `starting` for a moment, until its first position.
- mplayer ignores the positions that arrive between a new file being sent and its "Starting playback" line, since they
  belong to the file before.

## The amplifier

With `AUD_AMPLIFIER_PLAYER_INPUT` set (the input the sound of the player arrives on, for example `AV5`), starting the
music also gets the amplifier ready, so it can be heard without setting the amplifier up by hand:

- It is done when the user starts the music: playing tracks or an album, playing a track of the queue, and resuming
  a paused or stopped player. It is not done when a track ends and the next one starts, or for Next and Previous, so
  an input that is chosen on the amplifier while music plays is not changed back.
- The amplifier is asked first (not the state that is kept, which can be 5 seconds old). If it is in standby it is
  switched on and the server waits, up to 10 seconds, until it says it is on, and then selects the input,
  trying 3 times because an amplifier that is starting up may not accept it yet. If it is on, only the input is
  changed, and only when it is another one.
- The volume and the mute are never changed.
- The music does not start until the amplifier is ready, so none of it is lost while the amplifier starts up (see
  "Starting" below). The wait is only noticeable when the amplifier was in standby, as asking an amplifier that is on
  takes a fraction of a second.
- It never stops the music: when the amplifier cannot be reached or does not switch on, a warning is logged and the
  music plays. Several presses of Play while it is running share one run.
- Without the setting nothing is done, which is what you want when the sound does not go to the amplifier, for example in
  development, where the player plays on the speakers of the computer.

## Audiobooks

The audiobook pages (`/audiobooks`: authors, books, a book with its parts) are described in library.md. A book is played with
`player_play_book { albumId, partId? }`, which replaces the queue with the parts of the book (Undo
brings the old queue back). The queue is then a book queue, which is only played:

- Moving, removing, adding (music or anything else), shuffle and repeat are refused with a 409 and a message, and the UI
  hides them. Play, pause, seek, Next, Previous, tapping a part and Clear work. The requests about tracks (`play_tracks`,
  `enqueue`, `play_next`, `play_now`) are about music and look their ids up in the music library only, so the part of a book is
  not found by them: a book gets into the queue through `player_play_book`, which looks in the audiobooks. The collection of a
  track is kept in the queue, so the file of a track is looked for in the right library.
- Where the listening was left is kept for the whole household in `book-progress.json` in the data folder, by book: the
  part and the place in it. It is written when the book is paused, sought, replaced, changes part and every 15 seconds while
  it plays. A book that is heard to its end is forgotten and starts over. Playing a book, or pressing Play on the queue
  after a restart, starts 15 seconds before the saved place. `partId` starts that part from its beginning.
- A book is one entry in the history (see history.md): listening to it for 30 seconds records it, and more listening moves the entry to the top with the new time. Its queue is not kept among the previous queues.
- The engines get `startSec` and `accurateSeek` with every file. Music is played with `accurateSeek` (see mplayer below),
  audiobooks without, because on a Raspberry Pi 3 a seek to hour 10 of a 340 MB constant bitrate book takes 22 s with
  `-hr-mp3-seek` and 3 s without, and lands on the right place in both. mplayer is started again (about 2 seconds) when
  the next file wants the other kind.

## The engines

Both play one file at a time and are chosen with `AUD_PLAYER`. A file that cannot be played, or a program that dies,
is reported to the service, which skips to the next track.

**mpv** is started on the first track and stays running. It is controlled over its JSON IPC socket
(`/tmp/aud-mpv.sock`): commands such as `loadfile` go in as lines of JSON, and the position (`time-pos`) and the end
of a file come back as events. There is a short gap between tracks, since each file is loaded when the one before it
has ended.

**mplayer** is for a machine that has mplayer but a system too old for a current mpv (the music Pi runs Raspbian 10,
which only has mpv 0.29). It runs in slave mode, started with `-msglevel global=6`:

- Commands go to its input, one per line: `loadfile "<file>" 0`, `pause`, `seek <seconds> 2`. File names are
  quoted and escaped. `pause` is a toggle, so the engine keeps track of whether it is paused.
- It has no events. The end of a file is the line `EOF code: 1` (codes 2 and 4 are a file that was replaced or
  stopped by us and are ignored), a file that cannot be opened is `Failed to open`, and the position is asked for twice
  a second with `get_time_pos`.
- While paused, commands must be sent as `pausing_keep_force <command>`, or mplayer starts playing again.
- It is started with `-hr-mp3-seek` for music (not for audiobooks, see above). Some mp3 files have a variable bitrate and no Xing header (no table of
  contents). Without this option mplayer guesses the byte position of a seek from the bitrate, lands somewhere
  else in the song and still counts from the time that was asked for, so the position runs past the end of the track and
  no end of file comes. With the option mplayer finds the exact place by scanning the file, which is a little slower
  the further into the track (and on a slow machine) the seek goes.
- Some broken or empty files make mplayer print nothing at all. A file that has given no position for 5 seconds
  is therefore counted as failed.
