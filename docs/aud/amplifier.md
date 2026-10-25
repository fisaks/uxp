# AUD Amplifier

Control of a Yamaha AV receiver (developed against an RX-V673) from the AUD remote app: power,
volume, mute, input, sound program (including Straight and Enhancer) and the FM tuner.

## Configuration (BFF environment)

| Variable | Required | Meaning |
|---|---|---|
| `AUD_AMPLIFIER_HOST` | yes | Host name or IP address of the amplifier, optionally with a port |
| `AUD_AMPLIFIER_INPUTS` | no | Inputs to show, in order, with labels: `"AV5=Music App,HDMI1=Chromecast,TUNER"`. An input without a label uses the amplifier's own title. When not set all inputs the amplifier offers are shown. |

Quote `AUD_AMPLIFIER_INPUTS` when a label contains a space (see
[Adding a remote app](../uxp/adding-a-remote-app.md#pitfalls)).

## How it works

- `YamahaClient` (`aud-bff/src/amplifier/yamaha.client.ts`) talks to the amplifier's XML interface:
  `POST http://<host>/YamahaRemoteControl/ctrl` with `<YAMAHA_AV cmd="GET|PUT">...</YAMAHA_AV>`.
  Requests are sent one at a time and time out after 3 seconds. A reply with `RC` other than 0 is an
  error (for example `RC="2"` means the command is not supported).
- `AmplifierService` keeps the last known state and pushes it to subscribed clients as the
  `amplifier_state` WebSocket message, only when it changed. The amplifier is polled every 5 seconds
  while at least one client is subscribed, and not at all otherwise. If the amplifier does not answer,
  `reachable` becomes false and the last known status is kept.
- Commands are the `amplifier_set_*` WebSocket actions. The server checks the values (inputs, sound
  programs and presets must be ones the amplifier offered, and numbers are snapped to the steps and range
  the amplifier reports), sends the command, updates the state at once and reads it back after one
  second. The response is the new state. An unreachable amplifier gives `DISCONNECTED`, a refused
  command `INVALID_STATE`, an unknown value `VALIDATION`.
- The volume uses the whole range of the amplifier, -80.5 to +16.5 dB. A volume typed into the value
  box keeps the sign of the current volume (`15` is -15 dB while the volume is negative); type the sign
  to flip it (`+5`, `-5`). A missing minus sign would otherwise set a very loud volume.
- The UI subscribes once when the WebSocket connects (`amplifier_subscribe`), so any open AUD
  page keeps the amplifier polled.

## About the amplifier interface

The amplifier describes its own interface at `http://<host>/YamahaRemoteControl/desc.xml`: every
menu, command path and allowed value. The sound programs of the model are read from there, so
another Yamaha model offers its own list. Notes from the RX-V673:

- Volume is reported as `Val` and `Exp`: `Val -200` with `Exp 1` is -20.0 dB. The range is
  -80.5 to +16.5 dB in steps of 0.5.
- Status can be read in standby, so the page shows the state before the amplifier is switched on.
- Tuner information is only meaningful while the amplifier is on with the TUNER input selected.
- Dolby and DTS cannot be selected: the amplifier chooses the decoder from the incoming signal.
  The nearest setting is the *Surround Decoder* program. The interface does not report the format
  of the incoming signal.
- Main zone settings the page controls: power, volume, mute, input, sound program, Straight, Enhancer,
  Pure Direct, Adaptive DRC (Auto or Off), CINEMA DSP 3D (Auto or Off), bass and treble (-6 to +6 dB),
  subwoofer trim (-6 to +6 dB), dialogue level (0 to 3) and dialogue lift (0 to 5). Those ranges are not
  in the code: the BFF reads them (and the sound programs) from `desc.xml` and sends them to the page as
  part of the amplifier info. Every value sent by a client is moved to the nearest step inside the
  range before it goes to the amplifier.
- Other settings in `desc.xml` that are not used yet: scenes, sleep timer, zone 2, and the other input
  sources (AirPlay, USB, iPod, net radio, server, Napster) with their play info and browsing.
