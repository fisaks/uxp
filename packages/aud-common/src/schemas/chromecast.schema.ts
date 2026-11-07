// JSON schemas that validate the payloads of the Chromecast WebSocket actions

export const ChromecastSeekSchema = {
    type: "object",
    properties: { positionSec: { type: "number", minimum: 0 } },
    required: ["positionSec"],
    additionalProperties: false,
};
