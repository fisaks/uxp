# AUD Chromecast

AUD watches a Chromecast (developed against an audio-only Chromecast on an amplifier input) and shows and
controls what is cast to it: Spotify, Storytel and YouTube. It joins the Chromecast as one more sender, so
the phone that cast is not disturbed. Settings of the device (name, Wi-Fi, factory reset) are left to the
Google Home app.

## Configuration (BFF environment)

| Variable | Required | Meaning |
|---|---|---|
| `AUD_CHROMECAST_HOST` | no | Host name or IP address of the Chromecast. Unset = the Chromecast is not watched and its tile is hidden. No mDNS is needed. |
| `AUD_AMPLIFIER_CHROMECAST_INPUT` | no | The amplifier input the Chromecast is on, for example `HDMI1`. When set, casting turns the amplifier on and selects this input. Unset = no automatic switch and no pausing of AUD. |

When two environments share the same Chromecast and amplifier (for example development and production), set
`AUD_AMPLIFIER_CHROMECAST_INPUT` in one of them only, otherwise both switch the amplifier.

## How it works

- `ChromecastService` (`aud-bff/src/chromecast/chromecast.service.ts`) keeps a Cast v2 connection (TLS, port
  8009, library `castv2`) open all the time, whether or not a client is subscribed. It sends a heartbeat
  every 5 seconds, reads the status every 4 seconds as a safety net, and reconnects with a growing delay
  (2 to 30 seconds). The device may sleep or reboot: a refused connection is shown as `reachable: false`.
- The receiver channel gives the running app (shown as the app name), the media channel gives state,
  position, title, artist, cover and the commands the app supports. Only a whitelist of fields is sent
  to the UI: Storytel's status carries a stream URL with a token, which must never be logged or forwarded.
- Device information (firmware, uptime, Wi-Fi signal, update available) comes from the Chromecast's HTTP
  API on port 8008 and is refreshed every minute.
- The state is pushed to subscribed clients as `chromecast_state` (`chromecast_subscribe`).
- Commands are the `chromecast_*` WebSocket actions: `play`, `pause`, `seek` (absolute seconds),
  `next`, `previous`, `stop_app`, `reboot` and `select_amp`. A media command is refused with 409 when
  the app does not list it (Spotify has next/previous, Storytel and YouTube only pause and seek, so the UI
  shows play/pause and skip 30 seconds instead).
- `reboot` calls `POST :8008/setup/reboot`. The device is gone after about 15 seconds and back after about 40.
  The UI asks for confirmation and waits at most 2 minutes.
- `stop_app` stops the running app, which clears an app that sits open and empty without a reboot.

## Automatic amplifier switch

When something starts playing on the Chromecast and `AUD_AMPLIFIER_CHROMECAST_INPUT` is set, AUD

1. pauses its own side (the player and Spotify through its Soloist instances): the cast wins,
2. turns the amplifier on and selects the input, unless it is already on that input.

This happens once per cast session: only the transition to `PLAYING` counts (not `BUFFERING`), track changes
do not trigger it again, and an app already running when the BFF connects (restart, reconnect) does not
trigger it. A pause starts a new session. Nothing is switched back when the cast stops; the amplifier's
sleep timer handles that.

The other way round: when AUD moves the amplifier off the Chromecast input (the input is changed in the UI, or
the player starts), a playing cast is paused. An input changed with the amplifier's own remote is not noticed,
because the amplifier is only polled while a client is subscribed.

## Where it shows

- Home: a "Chromecast" tile (cover, app and title, "Idle" or "Not reachable"). The "Now playing" tile shows
  the Chromecast while the amplifier is on its input and something plays.
- Chromecast page (`/chromecast`): alerts, switch amplifier, stop casting / stop app, restart, status
  (firmware, uptime, Wi-Fi signal in words and dBm, IP, update available, last cast), now playing with
  controls.
- The now playing bar, the now playing page and the Audio tab of System Center show the Chromecast session
  instead of the player while the amplifier is on the Chromecast input and the Chromecast has playback.
  Spotify shows a "Next:" line from the track window the app reports.
- Health (`chromecast_check`, header popup, only when `AUD_CHROMECAST_HOST` is set): error when the device
  has been unreachable for 2 minutes, warning when the Wi-Fi signal is weaker than -75 dBm.
  No e-mail alerts.
