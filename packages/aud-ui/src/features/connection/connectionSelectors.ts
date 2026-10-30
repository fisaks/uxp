import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectConnectionState = (state: RootState) => state.connection;

export const selectConnected = createSelector([selectConnectionState], (connection): boolean => connection.connected);
