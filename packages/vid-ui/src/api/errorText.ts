import { ErrorCodeMessageMap, mapApiErrorsToMessageString } from "@uxp/ui-lib";

/** The wording of the errors VID answers with. What the BFF sends in `params` makes the text say what it is about. */
const VID_ERROR_MESSAGES: ErrorCodeMessageMap = {
    NOT_FOUND: (params) => (params?.resource ? `There is no such ${params.resource}.` : "It could not be found."),
    ALREADY_EXISTS: (params) => (params?.name ? `“${params.name}” already exists.` : "That already exists."),
    CONFLICT: (params) => (params?.resource ? `That cannot be done while the ${params.resource} plays.` : "That cannot be done right now."),
    UNREACHABLE: (params) => (params?.resource ? `The ${params.resource} could not be reached.` : "It could not be reached."),
    INVALID_STATE: "That cannot be done right now.",
};

/** The text for an error the BFF answered with. */
export const errorText = (error: unknown): string => mapApiErrorsToMessageString(error, VID_ERROR_MESSAGES);

/** The text for what a query rejected with: an RTK Query rejection holds the error of the base query in `error`. */
export const rejectionText = (rejected: unknown): string =>
    errorText(typeof rejected === "object" && rejected !== null && "error" in rejected ? rejected.error : rejected);
