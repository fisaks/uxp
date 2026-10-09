import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ElectricityPriceSnapshot, UhnElectricityPricesResponse } from "@uhn/common";
import { RootState } from "../../app/store";

type ElectricityState = {
    snapshot: ElectricityPriceSnapshot;
};

const initialState: ElectricityState = {
    snapshot: { prices: [], fetchedAt: "" },
};

const electricitySlice = createSlice({
    name: "electricity",
    initialState,
    reducers: {
        electricityPricesReceived(state, action: PayloadAction<UhnElectricityPricesResponse>) {
            state.snapshot = action.payload.snapshot;
        },
    },
});

export const { electricityPricesReceived } = electricitySlice.actions;
export const selectElectricitySnapshot = (state: RootState) => state.electricity.snapshot;
export default electricitySlice.reducer;
