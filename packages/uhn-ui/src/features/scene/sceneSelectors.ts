import { createSelector } from "@reduxjs/toolkit";
import { RuntimeScene } from "@uhn/common";
import { RootState } from "../../app/store";

const selectSceneState = (state: RootState) => state.scenes;

export const selectAllScenes = createSelector(
    [selectSceneState],
    (scenes): RuntimeScene[] => scenes.allIds.map(id => scenes.byId[id])
);

export const selectScenesById = createSelector(
    [selectSceneState],
    (scenes): Record<string, RuntimeScene> => scenes.byId
);
