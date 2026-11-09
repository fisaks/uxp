import type { RootState } from "../../app/store";

export const selectSaveErrorMessage = (root: RootState) => root.saveError.message;
