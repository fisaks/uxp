# VID Casting

A clip can be played in this browser, in the player tab (`player-tab.md`) or on a Chromecast. This page
describes the Chromecast side: stream links, discovery, sessions, the Chromecasts page and the power
control of a Philips TV.

## Stream links

A Chromecast fetches the video itself and has no login cookie. The BFF therefore signs the address:

- `POST /api/home-videos/clips/:id/stream-link` (logged in) returns `{path, expiresAt}`.
- `GET /api/home-videos/stream/:id?exp=...&sig=...` needs no login. `sig` is an HMAC-SHA256 of `id.exp`.
  The key is derived from `JWT_SECRET`, so a link is bound to one clip and stops working after 12 hours.
  A bad or expired signature is 403.
- The stream supports range requests (206, a tail range, 416 past the end), `video/mp4`, and is never cached.
- `GET /api/home-videos/poster/:id` is the same for the poster frame, sent to the Chromecast so the TV shows
  a picture and a title.

The link is not tied to a network: anyone who holds it can fetch that one clip until it expires. A browser gets
the relative `path` and fetches it through the app's own address. A Chromecast gets an absolute address built from
`VID_PUBLIC_BASE_URL`.

A link is valid for 12 hours from the moment it was made. The browser and the player tab make a new one each
time a clip starts, so only a clip that is paused for more than 12 hours, or plays longer than that, stops when
the link expires. The link is not refreshed while the clip is open. A cast uses the link as it was when the clip
was loaded.

Casting needs `VID_PUBLIC_BASE_URL`, an address the Chromecast can reach, and a firewall that lets the
Chromecast connect to the BFF port.

## Discovery and sessions

- Chromecasts are found with mDNS (`_googlecast._tcp`). The network is queried again every 30 s. A saved group keeps a device that is not found in its list.
- A **session** is one clip on one device. `CastSession` connects to the device (port 8009), starts the
  Default Media Receiver, sends LOAD with the signed link, title and poster, and follows the media status
  (state, position, rate) and the heartbeat. It reconnects with backoff.
- The BFF's **`ChromecastWatcher`** keeps a passive connection to every discovered device and sends no LAUNCH,
  so an idle TV is not woken. It follows what plays, whoever started it. A session this BFF owns is recognised
  by its stream address, so after a BFF restart a running cast is picked up again with its queue.
- The state is pushed to the browser as the `cast_state` WebSocket message (after `cast_subscribe`) and the
  Chromecasts page uses `chromecasts_subscribe` / `chromecasts_state`. Stream addresses from other
  senders' media are not logged or sent on.
- A finished, stopped or failed session stays in the list for 5 s and then goes.
- Playback speed: 0.5x to 2x (the Chromecast refuses more). The position keeps running at the chosen rate.
  Some devices keep the rate over a new clip, so the BFF sets it again when the device reports another one.
  The browser player has its own speeds, up to 16x.

## Where the controls are

The cast bar at the bottom of the video pages, the player page and the System Center tab show only VID's own
sessions. The Chromecasts page shows everything that plays on every device and can control it where the
device supports it.

| Route | Purpose |
|---|---|
| `GET /cast`, `POST /cast/refresh` | State, rediscover |
| `POST /cast/sessions {clipId, deviceIds[], positionSec?}` | Cast a clip to one or more devices (each a queue of one) |
| `POST /cast/sessions/:id/play\|pause\|seek\|rate\|next\|restart\|stop` | Transport. `:id` is a device or a group |
| `POST /cast/players/:id/queue` | Queue actions, see `queues.md` |
| `GET /chromecasts` | Every device with its details and what plays |
| `POST /chromecasts/:id/play\|pause\|seek\|stop\|reboot` | Control of any device |
| `POST /chromecasts/:id/tv-pairing/start\|confirm\|forget`, `POST .../tv-power` | Philips TV, see below |

POST routes without a body must be sent without a `Content-Type: application/json` header.

## The Chromecasts page

One card per device: name, model, address, firmware, uptime, Wi-Fi signal, what plays, and the VID session.
**Stop casting** stops the running app, also one started from a phone. **Reboot** is offered only for a
device that reports a Wi-Fi signal and asks for confirmation; the device is gone for about 40 s.

## Philips TV power control

A Philips Android TV can be switched on and off from the Chromecasts card and off automatically after a cast.
This uses the TV's JointSpace API (HTTPS on port 1926, digest authentication).

- **Pairing.** The card shows "Power control" when the TV answers JointSpace. Pair asks the TV for a PIN, which
  appears on the TV, and the dialog sends it back. The id and key are stored in `tv-pairings.json` in
  `VID_DATA_DIR`. A pending pairing times out after 2 minutes. Forget deletes it.
- **Manual.** A paired TV gets an on and off switch (`POST /api/chromecasts/:id/tv-power {state: On|Standby}`).
- **Automatic switch off.** A paired TV is switched off 60 s after a cast ends (clip finished, Stop or failure)
  when all of this holds: the cast itself woke the TV (the receiver reported standby before the LAUNCH), the app
  in front is one the cast showed (the cast receiver or the TV's home screen, noted while the clip played and
  10 s after it ended) and nothing else plays. Starting another cast within the 60 s cancels it. A TV that was
  already on, or something else opened in the gap (for example a streaming app), is left alone. Pairing is
  the opt-in; an unpaired TV and every other device is never switched off. A cast taken over after a BFF
  restart is never switched off.
- The TV stops answering on port 1926 if requests arrive on a new connection each time. The client therefore
  uses one kept-alive connection. If the TV stops answering anyway, switch it off at the mains.

The Chromecast dongle on a projector or amplifier is not touched by any of this.
