import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiTokenCreateResponse } from "@uhn/common";

type ApiTokenState = {
    createDialog: {
        open: boolean;
    };
    createdDialog: {
        open: boolean;
        tokenData?: ApiTokenCreateResponse;
    };
};

const initialState: ApiTokenState = {
    createDialog: {
        open: false,
    },
    createdDialog: {
        open: false,
        tokenData: undefined,
    },
};

const apiTokenSlice = createSlice({
    name: "apiToken",
    initialState,
    reducers: {
        openCreateDialog(state) {
            state.createDialog.open = true;
        },
        closeCreateDialog(state) {
            state.createDialog.open = false;
        },
        openCreatedDialog(state, action: PayloadAction<ApiTokenCreateResponse>) {
            state.createdDialog.open = true;
            state.createdDialog.tokenData = action.payload;
        },
        closeCreatedDialog(state) {
            state.createdDialog.open = false;
            state.createdDialog.tokenData = undefined;
        },
    },
});

export const {
    openCreateDialog,
    closeCreateDialog,
    openCreatedDialog,
    closeCreatedDialog,
} = apiTokenSlice.actions;
export default apiTokenSlice.reducer;
