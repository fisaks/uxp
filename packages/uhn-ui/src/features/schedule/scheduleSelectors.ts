import { createSelector } from "@reduxjs/toolkit";
import { RuntimeSchedule, ScheduleMuteInfo, UserScheduleInfo } from "@uhn/common";
import { RootState } from "../../app/store";

const selectScheduleState = (state: RootState) => state.schedules;

export const selectBlueprintSchedules = createSelector(
    [selectScheduleState],
    (s): RuntimeSchedule[] => s.blueprintSchedules
);

export const selectUserSchedules = createSelector(
    [selectScheduleState],
    (s): UserScheduleInfo[] => s.userSchedules
);

export const selectScheduleMutes = createSelector(
    [selectScheduleState],
    (s): ScheduleMuteInfo[] => s.mutes
);

/** Map of scheduleId → mute info for quick lookup. Filters out expired timed mutes. */
export const selectMuteByScheduleId = createSelector(
    [selectScheduleMutes],
    (mutes): Record<string, ScheduleMuteInfo> => {
        const now = Date.now();
        const map: Record<string, ScheduleMuteInfo> = {};
        for (const m of mutes) {
            // Skip expired timed mutes (null mutedUntil = indefinite, always active)
            if (m.mutedUntil && new Date(m.mutedUntil).getTime() < now) continue;
            map[m.scheduleId] = m;
        }
        return map;
    }
);

export const selectSchedulesLoaded = createSelector(
    [selectScheduleState],
    (s) => s.isLoaded
);
