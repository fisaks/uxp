import { configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import adminUserManagementSlice from "../features/control-panel/adminUserManagementSlice";
import errorSlice from "../features/error/errorSlice";
import globalConfigSlice from "../features/global-config/globalConfigSlice";
import loadingSlice from "../features/loading/loadingSlice";
import navigationSlice from "../features/navigation/navigationSlice";
import mySettingSlice from "../features/settings/mySettingSlice";
import healthSlice from "../features/header/healthSlice";
import userSlice from "../features/user/userSlice";
import { uxpUserBroadcastMiddleware } from "./uxpUserBroadcast.middleware";

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
        navigation: navigationSlice,
        globalConfig: globalConfigSlice,
        health: healthSlice,
        adminUserManagement: adminUserManagementSlice,
    },
    devTools: process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .concat(uxpUserBroadcastMiddleware)
    .concat(logger),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
