import { FieldKey, FieldKeyType } from "@h2c/common";
import { createSlice } from "@reduxjs/toolkit";
import { addKey, fetchFieldsByType, removeKey } from "./fieldKeyThunk";



type CustomFieldsState = {
    types: {
        [key in FieldKeyType]?: FieldKey[];
    }
};
const initialState: CustomFieldsState = {
    types: {}
};

const customFieldsSlice = createSlice({
    name: "customFields",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchFieldsByType.fulfilled, (state, action) => {
                state.types = {
                    ...state.types,
                    ...action.payload
                };
            })
            .addCase(addKey.fulfilled, (state, action) => {
                const { type, key, normalizedKey } = action.payload;
                if (!state.types[type]) {
                    state.types[type] = [];
                }
                if (!state.types[type].some((item) => item.normalizedKey === normalizedKey)) {
                    state.types[type]!.push({ key, normalizedKey });
                }
            })
            .addCase(removeKey.fulfilled, (state, action) => {
                const { type, key } = action.meta.arg;
                const normalizedKey = key.trim().toLowerCase();
                state.types[type] = state.types[type]?.filter((item) => item.normalizedKey !== normalizedKey) || [];
            });
    },
});

//export const { setHouseData } = houseSlice.actions;
export default customFieldsSlice.reducer;
