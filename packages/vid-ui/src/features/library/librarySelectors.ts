import type { RootState } from "../../app/store";

export const selectScanning = (root: RootState) => Boolean(root.library.state?.scanning);
