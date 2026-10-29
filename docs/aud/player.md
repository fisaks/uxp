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
- The **queue** keeps the tracks in the order they were added. The **play order** is the same, unless shuffle is on:
  then it is a random order that is made once, starting with the track that is playing, and followed forwards and
  backwards, so Previous goes back the way you came. Turning shuffle off continues from the current track in the
  order of the queue.
- **Repeat** is `off` (stop after the last track, ready at the start of the queue), `all` (start again) or `one`
  (the same track again). Next and Previous ignore `one`.
- **Previous** plays the track again when it has played for more than 3 seconds, otherwise the one before.
- A track whose file is missing or that mpv cannot play is skipped. When every track of the queue fails one after the
  other the player stops.
- The queue is not kept when the backend restarts.

## What the UI does

Clients subscribe once (`player_subscribe`) and get `player_state` whenever the player changes. The state carries the
position of the current track at the time it was sent, and the UI moves it on from the time it received it, so
the server does not send a state every second. While playing, the server also sends the real position of the sound every 2 seconds (`player_position`, a few
bytes) so the moving position cannot drift from the sound, for example when a file is slow to start or a seek lands
a little off. The commands are the other `player_*` actions: `play_tracks`
(replaces the queue), `enqueue`, `play_index`, `remove`, `clear`, `pause`, `resume`, `next`, `previous`, `seek`,
`set_shuffle` and `set_repeat`. Each answers with the new state.

The now playing bar is at the bottom of every page of the app while the queue has tracks; the Queue tab lists
the queue. In the Library an album can be played, shuffled or added to the queue, and a track can be played (the
album then becomes the queue, starting there) or added.

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
- It happens at the same time as the player starts the file, so the first seconds of the first track may be
  lost while the amplifier starts up.
- It never stops the music: when the amplifier cannot be reached or does not switch on, a warning is logged and the
  music plays. Several presses of Play while it is running share one run.
- Without the setting nothing is done, which is what you want when the sound does not go to the amplifier, for example in
  development, where the player plays on the speakers of the computer.

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
- It is started with `-hr-mp3-seek`. Some mp3 files have a variable bitrate and no Xing header (no table of
  contents). Without this option mplayer guesses the byte position of a seek from the bitrate, lands somewhere
  else in the song and still counts from the time that was asked for, so the position runs past the end of the track and
  no end of file comes. With the option mplayer finds the exact place by scanning the file, which is a little slower
  the further into the track (and on a slow machine) the seek goes.
- Some broken or empty files make mplayer print nothing at all. A file that has given no position for 5 seconds
  is therefore counted as failed.
