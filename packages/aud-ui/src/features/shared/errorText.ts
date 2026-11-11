import { ErrorCodeMessageMap, mapApiErrorsToMessageString, WebSocketError } from "@uxp/ui-lib";

/** The reasons the server gives, in `params.reason`, for a command that does not fit the state of what it is sent to. */
const INVALID_STATE_TEXT: Record<string, string> = {
    "no-undo": "There is no queue to bring back.",
    gain: "The gain can only be set for a song of the library that is playing.",
    audiobook: "The queue is an audiobook, it cannot be changed.",
    "nothing-playing": "Nothing is playing on the Chromecast.",
};

/** The wording of the errors AUD answers with. What the server sends in `params` makes the text say what it is about. */
const AUD_ERROR_MESSAGES: ErrorCodeMessageMap = {
    NOT_FOUND: "Not found.",
    UNREACHABLE: (params) => (params?.resource ? `The ${params.resource} cannot be reached.` : "It cannot be reached."),
    INVALID_STATE: (params) => {
        if (params?.reason === "unsupported") return params.app ? `${params.app} does not support that.` : "The app does not support that.";
        return (params?.reason && INVALID_STATE_TEXT[params.reason]) || "That cannot be done right now.";
    },
};

/** The text for an error the server answered with, or `fallback` for a failure that is not one of those (the connection, say). */
export const errorText = (error: unknown, fallback: string, overrides?: ErrorCodeMessageMap): string =>
    error instanceof WebSocketError ? mapApiErrorsToMessageString(error, { ...AUD_ERROR_MESSAGES, ...overrides }) : fallback;
