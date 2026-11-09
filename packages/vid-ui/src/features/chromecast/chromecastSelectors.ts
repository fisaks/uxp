import type { RootState } from "../../app/store";

export const selectChromecasts = (root: RootState) => root.chromecast.state;
