import { configureStore } from "@reduxjs/toolkit";
import { remoteAppReducer } from "@uxp/ui-lib";
import { createLogger } from "redux-logger";

import templateReducer from "../features/template/templateSlice";
import chatReducer from "../features/chat/chatSlice"

export const createStore = () => {
    const logger = createLogger({
        predicate: () => process.env.NODE_ENV === "development",
        collapsed: true, // Collapse the logs for better readability
    });

    return configureStore({
        reducer: {
            template: templateReducer,
            remoteApp: remoteAppReducer,
            chat: chatReducer,
        },
        devTools: process.env.NODE_ENV === "development",
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

//export default store;
