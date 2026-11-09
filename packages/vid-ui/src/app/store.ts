import { configureStore } from "@reduxjs/toolkit";
import { remoteAppReducer } from "@uxp/ui-lib";
import { createLogger } from "redux-logger";
import { castReducer } from "../features/cast/castSlice";
import { chromecastReducer } from "../features/chromecast/chromecastSlice";
import { saveErrorReducer } from "../features/home-video/saveErrorSlice";
import { vidApi } from "./vidApi";

export const createStore = () => {
    const logger = createLogger({
        predicate: () => process.env.NODE_ENV === "development",
        collapsed: true,
    });

    return configureStore({
        reducer: {
            remoteApp: remoteAppReducer,
            [vidApi.reducerPath]: vidApi.reducer,
            cast: castReducer,
            chromecast: chromecastReducer,
            saveError: saveErrorReducer,
        },
        devTools: process.env.NODE_ENV === "development",
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(vidApi.middleware, logger),
    });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
