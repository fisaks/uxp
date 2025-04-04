import { House } from "@h2c/common";
import { createSlice } from "@reduxjs/toolkit";
import { addBuilding, addHouse, deleteHouse, fetcHouses, patchBuildingField, patchHouseField, removeBuilding } from "./houseThunks";

type HouseState = {
    houses: House[];
};
const initialState: HouseState = {
    houses: [],
};

const houseSlice = createSlice({
    name: "house",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetcHouses.fulfilled, (state, action) => {
                state.houses = action.payload;
            })
            .addCase(addHouse.fulfilled, (state, action) => {
                state.houses.push(action.payload);
            })
            .addCase(deleteHouse.fulfilled, (state, action) => {
                state.houses = [...state.houses.filter((h) => h.uuid !== action.payload)];
            })
            .addCase(patchHouseField.fulfilled, (state, action) => {
                state.houses = [...state.houses.map((h) => (h.uuid === action.payload.uuid ? action.payload : h))];
            })
            .addCase(addBuilding.fulfilled, (state, action) => {
                state.houses = state.houses.map((h) => h.uuid === action.payload.uuid ? action.payload : h);
            })
            .addCase(removeBuilding.fulfilled, (state, action) => {
                state.houses = state.houses.map((h) => h.uuid === action.payload.uuid ? action.payload : h);
            })
            .addCase(patchBuildingField.fulfilled, (state, action) => {
                state.houses = [...state.houses.map((h) => (h.uuid === action.payload.uuid ? action.payload : h))];
            })
    },
});

//export const { setHouseData } = houseSlice.actions;
export default houseSlice.reducer;
