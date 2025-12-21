import { configureStore } from "@reduxjs/toolkit";
import { remoteAppReducer, uploadTrackingReducer } from "@uxp/ui-lib";
import { createLogger } from "redux-logger";

import topicTraceReducer from "../features/topic-trace/topicTraceSlice";
import blueprintReducer from "../features/blueprint/blueprintSlice";
import loadingErrorReducer from "../features/loading-error/loadingErrorSlice";
import resourceReducer from "../features/resource/resourceSlice";
import runtimeStateReducer from "../features/runtime-state/runtimeStateSlice";
import { useDispatch } from "react-redux";
import { uhnApi } from './uhnApi';

export const createStore = () => {
    const logger = createLogger({
        predicate: () => process.env.NODE_ENV === "development",
        collapsed: true, // Collapse the logs for better readability
    });

    return configureStore({
        reducer: {
            remoteApp: remoteAppReducer,
            loadingError: loadingErrorReducer,
            uploadTracking: uploadTrackingReducer,
            topicTrace: topicTraceReducer,
            blueprint: blueprintReducer,
            [uhnApi.reducerPath]: uhnApi.reducer,
            resources: resourceReducer,
            runtimeState: runtimeStateReducer,

        },
        devTools: process.env.NODE_ENV === "development",
        middleware: (getDefaultMiddleware) => getDefaultMiddleware()
            .concat(logger).concat(uhnApi.middleware),
    });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();

//export default store;
