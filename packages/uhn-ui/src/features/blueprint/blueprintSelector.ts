import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

import { Blueprint } from "@uhn/common";
import { BlueprintIdentifierVersion } from "./blueprintSlice";

export const selectBlueprintState = (state: RootState) => state.blueprint;

export const selectBlueprintTrackingId = createSelector(selectBlueprintState, (blueprintState) => blueprintState.uploadTrackingId);


export const selectActivationLog = createSelector(
    selectBlueprintState,
    (blueprintState) => blueprintState.activationLog
);

export const selectBlueprintVersion = (blueprints?: Blueprint[], version?: BlueprintIdentifierVersion) => {
    if (!version || !blueprints) return undefined;
    return blueprints.find((bp) => bp.identifier === version.identifier)
        ?.versions.find(v => v.version === version.version);
}

