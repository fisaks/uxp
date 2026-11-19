import { buildPath } from "@uxp/common";
import { getBaseRoutePath } from "../../config";

export const LISTEN_PATH = "/listen";

/** The name of the window, so that opening it again finds the tab that is already open and a different book is shown in it. */
export const LISTEN_WINDOW_NAME = "aud-listen";

export const listenPagePath = (albumId: string) => `${LISTEN_PATH}/${albumId}`;

/** The address of the listen tab, without the header and the side bar of the portal. */
export const listenWindowUrl = (albumId: string) => `${buildPath(getBaseRoutePath() ?? "/", listenPagePath(albumId))}?printView=true`;
