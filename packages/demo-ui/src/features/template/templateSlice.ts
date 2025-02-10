import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchTemplate } from "./templateThunk";

type TemplateState = {
    value: string;
};

const initialState: TemplateState = {
    value: "",
};

const templateSlice = createSlice({
    name: "template",
    initialState,
    reducers: {
        setValue: (state, action: PayloadAction<string>) => {
            state.value = action.payload;
        },
        clearValue: (state) => {
            state.value = "";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTemplate.pending, (state) => {
                state.value = "Loading...";
            })
            .addCase(fetchTemplate.fulfilled, (state, action: PayloadAction<string>) => {
                state.value = action.payload;
            })
            .addCase(fetchTemplate.rejected, (state) => {
                console.error(fetchTemplate.rejected);
                state.value = "Failed to load template";
            });
    },
});

export const { setValue, clearValue } = templateSlice.actions;

export default templateSlice.reducer;
