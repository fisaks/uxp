import { configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";

import templateReducer from "../features/template/templateSlice";

const logger = createLogger({
    predicate: () => process.env.NODE_ENV === "development",
    collapsed: true, // Collapse the logs for better readability
});

const store = configureStore({
    reducer: {
        template: templateReducer,
    },
    devTools: process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
