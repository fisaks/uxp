import { configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import adminUserManagementSlice from "../features/control-panel/adminUserManagementSlice";
import errorSlice from "../features/error/errorSlice";
import globalConfigSlice from "../features/global-config/globalConfigSlice";
import headerMenuSlice from "../features/header/headerMenuSlice";
import loadingSlice from "../features/loading/loadingSlice";
import navigationSlice from "../features/navigation/navigationSlice";
import mySettingSlice from "../features/settings/mySettingSlice";
import userSlice from "../features/user/userSlice";

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
        navigation: navigationSlice,
        globalConfig: globalConfigSlice,

        adminUserManagement: adminUserManagementSlice,
    },
    devTools: process.env.NODE_ENV === "development",
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
