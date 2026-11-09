import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type SaveErrorState = {
    /** Why the last change of a clip was not saved. */
    message: string | undefined;
};

const saveErrorSlice = createSlice({
    name: "saveError",
    initialState: { message: undefined } as SaveErrorState,
    reducers: {
        saveFailed: (slice, action: PayloadAction<string>) => {
            slice.message = action.payload;
        },
        saveErrorCleared: (slice) => {
            slice.message = undefined;
        },
    },
});

export const { saveFailed, saveErrorCleared } = saveErrorSlice.actions;
export const saveErrorReducer = saveErrorSlice.reducer;
