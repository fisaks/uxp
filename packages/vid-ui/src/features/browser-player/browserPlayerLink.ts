import { buildPath } from "@uxp/common";
import { CastPlayerState, CastQueueRequest } from "@vid/common";
import { getBaseRoutePath } from "../../config";
import { PLAYER_WINDOW_PATH } from "../../menu";

/**
 * The player tab is a browser tab of its own, and the tab where the app is used talks to it over a BroadcastChannel (both
 * are on the same address). The tab plays the clips and owns the queue; the other tab only asks it to play and shows where it is.
 */
const CHANNEL_NAME = "vid-browser-player";
/** The name of the window, so that opening it again finds the tab that is already open. */
export const PLAYER_WINDOW_NAME = "vid-player";
/** The tab is gone when it has not answered for this long. */
export const PLAYER_STALE_MS = 5000;
/** How often the app asks the tab for its state, so that a tab in the background answers too. */
export const PLAYER_PING_MS = 2000;

/** The id the player tab has among the players of the app, where a Chromecast has its device id. Not 32 hex digits, so no device has it. */
export const PLAYER_TAB_ID = "player-tab";

/** What the app asks the tab to do: the same as it asks of a Chromecast, and `replace` can start in the middle of the clip, and with `follow` (a group id) the tab plays along with that group. */
export type BrowserPlayerCommand =
    | Exclude<CastQueueRequest, { action: "replace" }>
    | { action: "replace"; clipIds: string[]; positionSec?: number; follow?: string }
    | { action: "play" | "pause" | "next-clip" | "stop" }
    | { action: "seek"; positionSec: number };

/** Where the tab is: the queue, and the clip that plays in it. */
export type BrowserPlayerState = {
    clipIds: string[];
    index: number;
    repeat: boolean;
    state: CastPlayerState;
    positionSec: number;
    durationSec: number;
    /** Set while the tab plays along with this group: the group row shows it, not a row of its own. */
    followGroupId?: string;
};

export type ToPlayerMessage = { type: "command"; command: BrowserPlayerCommand } | { type: "ping" };
export type FromPlayerMessage = { type: "ready" } | { type: "state"; state: BrowserPlayerState } | { type: "closed" };

export const openChannel = () => new BroadcastChannel(CHANNEL_NAME);

/** Sends the command to a tab that is open. */
export const postToPlayer = (command: BrowserPlayerCommand) => {
    const channel = openChannel();
    channel.postMessage({ type: "command", command } satisfies ToPlayerMessage);
    channel.close();
};

/** The command a freshly opened tab is given when it says it is ready, since it was not there to hear it when it was asked. */
let pendingCommand: BrowserPlayerCommand | undefined;
export const setPendingCommand = (command: BrowserPlayerCommand | undefined) => {
    pendingCommand = command;
};
export const takePendingCommand = () => {
    const command = pendingCommand;
    pendingCommand = undefined;
    return command;
};

export const playerWindowUrl = () => `${buildPath(getBaseRoutePath() ?? "/", PLAYER_WINDOW_PATH)}?printView=true`;

/** The name the tab of the app takes, so that the player tab can bring it to the front by opening a window of that name. */
const MAIN_WINDOW_NAME = "vid-main";
export const nameMainWindow = () => {
    window.name = MAIN_WINDOW_NAME;
};

/**
 * Brings the tab of the app to the front, or opens the app when it is gone. A browser does not let a page focus another tab,
 * but opening a window by the name of one that exists, without an address, shows that one.
 */
export const showMainWindow = () => {
    if (window.opener && !window.opener.closed && window.opener.name === MAIN_WINDOW_NAME) window.open("", MAIN_WINDOW_NAME);
    else window.open(buildPath(getBaseRoutePath() ?? "/"), MAIN_WINDOW_NAME);
};
