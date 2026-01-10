

import { createSelector } from "@reduxjs/toolkit";
import { HealthSeverity } from "@uxp/common";
import { RootState } from "../../app/uxp.store";
import { HealthLevel } from "./health.types";
import { severityRank } from "./health.util";


const selectHealthState = (state: RootState) => state.health;

export const selectHealthSnapshots = createSelector(
    selectHealthState,
    (health) => Object.values(health.byApp)
);

export const selectHealthItemCount = createSelector(
    selectHealthSnapshots,
    (snapshots) =>
        snapshots.reduce((sum, snapshot) => sum + snapshot.items.length, 0)
);

export const selectGlobalHealthLevel = createSelector(
    selectHealthSnapshots,
    (snapshots): HealthLevel => {
        // No app has reported yet
        if (snapshots.length === 0) {
            return "unknown";
        }

        let worst: HealthSeverity = "ok";

        for (const snapshot of snapshots) {
            for (const item of snapshot.items) {
                if (severityRank[item.severity] > severityRank[worst]) {
                    worst = item.severity;
                }   
            }
        }

        return worst;
    }
);

export const selectHealthByApp = createSelector(
    selectHealthState,
    (health) => health.byApp
);

export const selectHealthNotice = createSelector(
    selectHealthState,
    state => state.notice
);
