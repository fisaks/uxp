# VID Cast Groups

A cast group plays the same clip on several Chromecasts at the same time and keeps them in step, for TVs in
different rooms. The player tab can play along.

Expect the accuracy of Wi-Fi Chromecasts, a fraction of a second. It is fine for different rooms and
not for the same room, where the echo is audible. That goes for the tab too.

## Groups

A group is `{id, name, deviceIds[], browser}`. `browser` means the player tab plays along. A group has at least
two members, counting the tab. It is stored in `cast-groups.json` in `VID_DATA_DIR`; names are unique, ignoring
case (409). The Cast groups page lists, creates, changes and deletes them (devices to choose from are
the discovered ones, and a saved device that is not found stays in the list). A running group cannot be
changed or deleted (409): stop it first. A device may be in several groups, but only one of them runs
at a time, and starting a single cast on a member stops the whole group.

A running group is one player. Its id is used like a device id in all cast routes (`casting.md`,
`queues.md`), so the bar, the player page, System Center, the queue and playlists work on it unchanged. There is
one queue for the group and its members have none. Member sessions are hidden while the group runs, and the
group's row is the one of the member furthest behind plus `members` (who is in sync or buffering).

| Route | Purpose |
|---|---|
| `GET/POST /cast/groups`, `PUT/DELETE /cast/groups/:id` | Groups, each answers the list |
| `POST /cast/groups/:id/start {clipId, positionSec?}` | Start a clip on the group (a queue of one, or replaces a running queue) |
| `GET /cast/groups/:id/run`, `POST /cast/groups/:id/stop` | The run with per-member state, position, skew and rate; stop |

## How the sync works

`CastGroupSession` in the BFF:

1. **Load.** Every member gets the clip with autoplay off and waits at the start position. Members that are
   not ready within 40 s are dropped.
2. **Start.** PLAY is sent to all, then the group waits until all report playing. Devices start at different
   speeds (under a second to several seconds), so a common start is not enough.
3. **Correct, every second.** Each member's position comes from the receiver's own status. The member
   furthest behind is the reference, nobody skips ahead of the slowest. A member's skew is its position minus the
   reference:
   - over 1 s: seek to the reference plus 0.4 s (a seek lands a little short), at most once per 5 s;
   - from 0.15 s to 1 s: playback rate 0.95 for the member that is ahead until the skew is under 0.1 s,
     then back to the normal rate;
   - under 0.15 s: nothing. Free-running drift was measured at about 0.06 s per 40 s, so corrections are
     rare after the first alignment.
   The row says "Syncing" until the skew is under 0.3 s.
4. **Speed.** The speed menu sets the rate on all members and the correction is applied on top of it. A
   member whose reported rate differs from the expected one is set again.
5. **Buffering.** A member that buffers for more than a second pauses the others, and they continue when it
   is back and are re-aligned.
6. **Transport.** Play, pause, seek, next and queue edits go to all members. A pause or play done outside
   (the TV remote) is followed by the others. The change is detected as a change of state, so there is no grace
   period.
7. **End.** A member that reaches the end waits for the rest. When all are done the queue advances, the
   repeat wraps, and a failure counts as for a single device. A member that fails, is stopped or is taken over
   by another cast leaves the group, the others play on, and when none is left the group is released.

When a Chromecast is not discovered at the start (discovery after a BFF restart can take about 45 s),
the group starts with the ones that are. A group is not restored after a BFF restart: its members rejoin as
single sessions.

The power control of a Philips TV (`casting.md`) works per member.

## The player tab as a member

The tab is not a member in the BFF. It **follows** the group's row and never sets the pace.

- The picker opens or reuses the tab from the click, with `follow: <group id>`, and then starts the group.
- The tab has its own small WebSocket connection that only subscribes to `cast_state`
  (`GroupFollower`). Each pushed row gives a target position (the row's position plus the time since it was
  sent, at the group's rate; the clock difference to the server is estimated from the arrival times).
- The tab applies the same two stages as the BFF, but can also speed up: skew over 1 s seeks, from 0.15 s to
  1 s the rate is the base rate times 0.95 (ahead) or 1.05 (behind), and under 0.1 s back to the base rate.
  When the group is not playing the tab pauses at the group's position.
- The clip is the group's: when the group's queue moves to another clip the tab loads it.
- While following, the tab's buttons (play, pause, seek, next, repeat, queue edits) and the commands from the main
  tab go to the group, the video follows, and the native controls and the speed button are hidden. A full
  screen button is shown instead. The player page of the group has a link that raises the tab.
- Stop and close just closes the tab, the group goes on. A `replace` without `follow` makes the tab play alone.
  When the group's row has gone, the tab stops following and shows ended, and stays open.
- The tab's own row is not shown while it follows, the group's row stands for it and the group row's member
  texts name only the Chromecasts.
