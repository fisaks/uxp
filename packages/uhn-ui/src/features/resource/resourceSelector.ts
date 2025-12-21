import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { selectRuntimeState } from "../runtime-state/runtimeStateSelector";

export const selectResourceState = (state: RootState) => state.resources;

export const selectResourceById = createSelector(selectResourceState, (resourceState) => resourceState.byId);
export const selectAllResources = createSelector(selectResourceState, (resourceState) => resourceState.allIds.map(id => resourceState.byId[id]));
export const selectResourcesIsLoaded = createSelector(selectResourceState, (resourceState) => resourceState.isLoaded);

export const selectResourcesWithState = createSelector(
    [selectAllResources, selectRuntimeState],
    (resources, runtimeState) =>
        resources.map(resource => ({
            ...resource,
            state: runtimeState.byResourceId[resource.id],
        }))
);