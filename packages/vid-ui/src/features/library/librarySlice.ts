import { LibraryState } from "@vid/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const librarySlice = createSlice({
    name: "library",
    initialState: { state: undefined as LibraryState | undefined },
    reducers: {
        /** The live state from the WebSocket, or the answer of the subscribe. */
        libraryReceived: (slice, action: PayloadAction<LibraryState>) => {
            slice.state = action.payload;
        },
    },
});

export const { libraryReceived } = librarySlice.actions;
export const libraryReducer = librarySlice.reducer;
