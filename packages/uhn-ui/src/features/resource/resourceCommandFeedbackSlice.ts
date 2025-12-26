// resourceCommandFeedback.slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CommandIssueReason = "send_failed" | "timeout";

export type ResourceCommandFeedback =
    | {
        status: "pending";
        startedAt: number;
    }
    | {
        status: "error";
        reason: CommandIssueReason;
        error: string;
        occurredAt: number;
    };

export type ResourceCommandFeedbackState = {
    byResourceId: Record<string, ResourceCommandFeedback | undefined>;
};

const initialState: ResourceCommandFeedbackState = {
    byResourceId: {},
};

const resourceCommandFeedbackSlice = createSlice({
    name: "resourceCommandFeedback",
    initialState,
    reducers: {
        commandStarted: (state, action: PayloadAction<{ resourceId: string }>) => {
            state.byResourceId[action.payload.resourceId] = {
                status: "pending",
                startedAt: Date.now(),
            };
        },

        commandResolved: (state, action: PayloadAction<{ resourceId: string }>) => {
            delete state.byResourceId[action.payload.resourceId];
        },

        commandFailed: (
            state,
            action: PayloadAction<{
                resourceId: string;
                reason: CommandIssueReason;
                error: string;
            }>
        ) => {
            state.byResourceId[action.payload.resourceId] = {
                status: "error",
                reason: action.payload.reason,
                error: action.payload.error,
                occurredAt: Date.now(),
            };
        },

        commandFeedbackCleared: (state, action: PayloadAction<{ resourceId: string, occurredAt: number }>) => {
            const fb = state.byResourceId[action.payload.resourceId];

            if (
                fb?.status === "error" &&
                fb.occurredAt === action.payload.occurredAt
            ) {
                delete state.byResourceId[action.payload.resourceId];
            }
        },

        clearAllCommandFeedback: (state) => {
            state.byResourceId = {};
        },

    },
});

export const {
    commandStarted,
    commandResolved,
    commandFailed,
    commandFeedbackCleared,
    clearAllCommandFeedback
} = resourceCommandFeedbackSlice.actions;

export default resourceCommandFeedbackSlice.reducer;
