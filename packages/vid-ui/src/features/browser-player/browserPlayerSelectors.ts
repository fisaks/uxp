import type { RootState } from "../../app/store";

export const selectBrowserPlayer = (root: RootState) => root.browserPlayer.state;
export const selectBrowserPlayerReceivedAt = (root: RootState) => root.browserPlayer.receivedAt;
