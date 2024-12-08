import { configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import errorSlice from "../features/error/errorSlice";
import loadingSlice from "../features/loading/loadingSlice";
import headerMenuSlice from "../features/header/headerMenuSlice";
import userSlice from "../features/user/userSlice";
import mySettingSlice from "../features/settings/mySettingSlice";

const logger = createLogger({
    predicate: () => process.env.NODE_ENV === "development",
    collapsed: true, // Collapse the logs for better readability
});

const store = configureStore({
    reducer: {
        user: userSlice,
        mySettings: mySettingSlice,
        loading: loadingSlice,
        error: errorSlice,
        headerMenu: headerMenuSlice,
    },
    devTools: process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
