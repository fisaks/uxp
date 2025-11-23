import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectTopicTraceState = (state: RootState) => state.topicTrace;

export const selectTopicTrace = () => createSelector([selectTopicTraceState], (topicTraceState) => topicTraceState.trace);

export const selectTopicPattern = () => createSelector([selectTopicTraceState], (topicTraceState) => topicTraceState.topicPattern);