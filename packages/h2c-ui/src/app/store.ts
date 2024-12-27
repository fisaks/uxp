import { configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";

import templateReducer from "../features/template/templateSlice";

export const createStore = () => {
    const logger = createLogger({
        predicate: () => process.env.NODE_ENV === "development",
        collapsed: true, // Collapse the logs for better readability
    });

    return configureStore({
        reducer: {
            template: templateReducer,
        },
        devTools: process.env.NODE_ENV === "development",
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

//export default store;
