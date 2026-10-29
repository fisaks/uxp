# AUD player

The player plays the tracks of the music library on the machine where the AUD backend runs (on the music Pi, the
analog output that goes into the amplifier). There is one queue and one player, shared by every browser.

## Configuration (BFF environment)

| Variable | Required | Meaning |
|----------|----------|---------|
| `AUD_PLAYER` | no | `mpv` (default) plays the music. `fake` only counts the time of the tracks, for development without speakers or mpv. |
| `AUD_MPV_COMMAND` | no | The mpv program, `mpv` by default. |
| `AUD_MPV_AUDIO_DEVICE` | no | The audio output of mpv, as listed by `mpv --audio-device=help`, for example `alsa/plughw:0,0`. mpv chooses when not set. |

The user the backend runs as needs access to the sound device (on Raspberry Pi OS: the `audio` group), and mpv must
be installed.

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
the server does not send a state every second. The commands are the other `player_*` actions: `play_tracks`
(replaces the queue), `enqueue`, `play_index`, `remove`, `clear`, `pause`, `resume`, `next`, `previous`, `seek`,
`set_shuffle` and `set_repeat`. Each answers with the new state.

The now playing bar is at the bottom of every page of the app while the queue has tracks; the Queue tab lists
the queue. In the Library an album can be played, shuffled or added to the queue, and a track can be played (the
album then becomes the queue, starting there) or added.

## mpv

mpv is started on the first track and stays running. It is controlled over its JSON IPC socket
(`/tmp/aud-mpv.sock`): commands such as `loadfile` go in as lines of JSON, and the position (`time-pos`) and the
end of a file come back as events. There is a short gap between tracks, since each file is loaded when the one before it
has ended.
