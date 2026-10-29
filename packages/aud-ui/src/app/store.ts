import { configureStore } from "@reduxjs/toolkit";
import { remoteAppReducer } from "@uxp/ui-lib";
import { createLogger } from "redux-logger";
import amplifierReducer from "../features/amplifier/amplifierSlice";
import connectionReducer from "../features/connection/connectionSlice";
import playerReducer from "../features/player/playerSlice";

export const createStore = () => {
    const logger = createLogger({
        predicate: () => process.env.NODE_ENV === "development",
        collapsed: true,
    });

    return configureStore({
        reducer: {
            remoteApp: remoteAppReducer,
            amplifier: amplifierReducer,
            connection: connectionReducer,
            player: playerReducer,
        },
        devTools: process.env.NODE_ENV === "development",
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    });
};

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
