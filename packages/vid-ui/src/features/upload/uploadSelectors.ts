import { RootState } from "../../app/store";

export const selectUploads = (state: RootState) => state.upload.items;

/** Whether a file is being sent or waits for its turn: the screen must stay on. */
export const selectSending = (state: RootState) => state.upload.items.some((i) => i.phase === "queued" || i.phase === "uploading");
