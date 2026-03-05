// src/features/resources/store/resourceCommandFeedback.listeners.ts
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { fullStateReceived, stateReceived } from "../runtime-state/runtimeStateSlice";
import {
    clearAllCommandFeedback,
    commandAcknowledged,
    commandFailed,
    commandFeedbackCleared,
    commandResolved
} from "./resourceCommandFeedbackSlice";

const ERROR_AUTO_CLEAR_MS = 6000;
const ACK_RESOLVE_FALLBACK_MS = 1000;

export const resourceCommandFeedbackListenerMiddleware = createListenerMiddleware();

/**
 * Auto-clear command errors after a short delay.
 */
resourceCommandFeedbackListenerMiddleware.startListening({
    actionCreator: commandFailed,
    effect: async (action, api) => {
        const { resourceId } = action.payload;
        const state: RootState = api.getState() as RootState;
        const cf = state.resourceCommandFeedback.byResourceId[resourceId];
        const occurredAt = cf?.status === "error" && cf.occurredAt;

        if (!occurredAt) return;

        await api.delay(ERROR_AUTO_CLEAR_MS);

        api.dispatch(
            commandFeedbackCleared({ resourceId, occurredAt })
        );

    },
});

/**
 * Ack fallback: resolve pending after a short grace period.
 * If a stateReceived arrives first, commandResolved fires immediately and
 * the startedAt nonce check makes this timer a no-op.
 */
resourceCommandFeedbackListenerMiddleware.startListening({
    actionCreator: commandAcknowledged,
    effect: async (action, api) => {
        const { resourceId, startedAt } = action.payload;
        await api.delay(ACK_RESOLVE_FALLBACK_MS);
        const state: RootState = api.getState() as RootState;
        const fb = state.resourceCommandFeedback.byResourceId[resourceId];
        if (fb?.status === "pending" && fb.startedAt === startedAt) {
            api.dispatch(commandResolved({ resourceId }));
        }
    },
});

resourceCommandFeedbackListenerMiddleware.startListening({
    actionCreator: stateReceived,
    effect: async (action, api) => {
        const resourceId = action.payload.response.state.resourceId;
        api.dispatch(commandResolved({ resourceId }));
    },
});

resourceCommandFeedbackListenerMiddleware.startListening({
    actionCreator: fullStateReceived,
    effect: async (_, api) => {
        api.dispatch(clearAllCommandFeedback());
    },
});
