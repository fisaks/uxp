import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeSchedule, ScheduleMuteInfo, UhnSchedulesResponse, UserScheduleInfo } from "@uhn/common";

export type SchedulesState = {
    /** Blueprint-defined schedules. */
    blueprintSchedules: RuntimeSchedule[];
    /** User-created schedules. */
    userSchedules: UserScheduleInfo[];
    /** Mute state for all schedules (blueprint + user). */
    mutes: ScheduleMuteInfo[];
    isLoaded: boolean;
};

const initialState: SchedulesState = {
    blueprintSchedules: [],
    userSchedules: [],
    mutes: [],
    isLoaded: false,
};

const schedulesSlice = createSlice({
    name: "schedules",
    initialState,
    reducers: {
        schedulesLoaded(state, action: PayloadAction<{ response: UhnSchedulesResponse }>) {
            const { schedules, userSchedules, mutes } = action.payload.response;
            state.blueprintSchedules = schedules;
            state.userSchedules = userSchedules;
            state.mutes = mutes;
            state.isLoaded = true;
        },
        schedulesCleared(state) {
            state.blueprintSchedules = [];
            state.userSchedules = [];
            state.mutes = [];
            state.isLoaded = false;
        },
    },
});

export const { schedulesLoaded, schedulesCleared } = schedulesSlice.actions;
export default schedulesSlice.reducer;
