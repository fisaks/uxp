import { RootState } from "../../app/store";

export const selectRuntimeStatusById = (state: RootState) => state.runtimeOverview.statusById;
