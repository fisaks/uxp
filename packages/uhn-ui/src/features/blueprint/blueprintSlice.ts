import { createSlice, PayloadAction } from "@reduxjs/toolkit";
export type BlueprintIdentifierVersion = { identifier: string; version: number };

type BlueprintState = {
    uploadTrackingId: string | undefined
    activationLog: {
        open: boolean;
        target?: BlueprintIdentifierVersion;
    }
    blueprintVersionLog: {
        open: boolean;
        target?: BlueprintIdentifierVersion;
    }
}

const initialState: BlueprintState = {
    uploadTrackingId: undefined,
    activationLog: {
        open: false,
        target: undefined,
    },
    blueprintVersionLog: {
        open: false,
        target: undefined,
    }
};

const blueprintSlice = createSlice({
    name: "blueprint",
    initialState,
    reducers: {
        setBlueprintTrackingId(state, action: PayloadAction<string | undefined>) {
            state.uploadTrackingId = action.payload;
        },
        openActivationListDialog(state, action: PayloadAction<BlueprintIdentifierVersion | undefined>) {
            state.activationLog.open = true;
            state.activationLog.target = action.payload;
        },
        closeActivationDialog(state) {
            state.activationLog.open = false;
            state.activationLog.target = undefined;
        },
        openBlueprintVersionLogDialog(state, action: PayloadAction<BlueprintIdentifierVersion>) {
            state.blueprintVersionLog.open = true;
            state.blueprintVersionLog.target = action.payload;
        },
        closeBlueprintVersionLogDialog(state) {
            state.blueprintVersionLog.open = false;
            state.blueprintVersionLog.target = undefined;

        }
    }



});


export const { setBlueprintTrackingId, openActivationListDialog, closeActivationDialog, openBlueprintVersionLogDialog, closeBlueprintVersionLogDialog } = blueprintSlice.actions;
export default blueprintSlice.reducer;