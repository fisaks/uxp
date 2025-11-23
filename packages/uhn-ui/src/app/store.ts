import { configureStore } from "@reduxjs/toolkit";
import { remoteAppReducer, uploadTrackingReducer } from "@uxp/ui-lib";
import { createLogger } from "redux-logger";

import topicTraceReducer from "../features/topic-trace/topicTraceSlice";
import { useDispatch } from "react-redux";

export const createStore = () => {
    const logger = createLogger({
        predicate: () => process.env.NODE_ENV === "development",
        collapsed: true, // Collapse the logs for better readability
    });

    return configureStore({
        reducer: {
            remoteApp: remoteAppReducer,
            uploadTracking: uploadTrackingReducer,
            topicTrace: topicTraceReducer
        },
        devTools: process.env.NODE_ENV === "development",
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();

//export default store;
