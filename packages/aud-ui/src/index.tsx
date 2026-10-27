import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ShadowRootProvider } from "@uxp/ui-lib";
import AudioApp from "./AudioApp";
import AudioSystem from "./AudioSystem";
import { createStore } from "./app/store";
import { getAppOption, getUxpAppIdentifier, getUxpContentId, initializeConfig } from "./config";
const styleInsert = require("../../tools/src/insert-function.cjs");

declare const module: __WebpackModuleApi.Module;

// The page that is mounted is chosen by the data-app-option of the HTML page: index.html is the app, system.html the System Center panel.
const APPLICATIONS = {
    AudioApp,
    SystemView: AudioSystem,
};

export const initApplication = (documentRoot: ShadowRoot | Document) => {
    const container = documentRoot instanceof Document ? documentRoot.head : documentRoot;
    const rootElement = documentRoot.getElementById("root");

    if (!rootElement) {
        throw new Error("Root element not found. Ensure you have an element with id 'root' in your HTML.");
    }
    __webpack_public_path__ = initializeConfig(rootElement) ?? "";

    styleInsert.init(container);
    const shadowKey = `${getUxpAppIdentifier()}-${getUxpContentId()}`.toLowerCase().replace(/[^a-z-]/g, "");
    const shadowCache = createCache({
        key: shadowKey,
        container: container,
    });

    const store = createStore();

    // Store the React root on the element to avoid duplicate createRoot calls
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const globalRootKey = "__UXP_APP_ROOT__";
    if (!(globalRootKey in rootElement)) {
        (rootElement as any)[globalRootKey] = ReactDOM.createRoot(rootElement);
    }
    const root = (rootElement as any)[globalRootKey];
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const renderApp = (AppComponent: React.ComponentType) => {
        root.render(
            <React.StrictMode>
                <Provider store={store}>
                    <CacheProvider value={shadowCache}>
                        <ShadowRootProvider documentRoot={documentRoot}>
                            <AppComponent />
                        </ShadowRootProvider>
                    </CacheProvider>
                </Provider>
            </React.StrictMode>
        );
    };
    const main = getAppOption<{ main?: keyof typeof APPLICATIONS }>()?.main ?? "AudioApp";
    renderApp(APPLICATIONS[main]);
    if (process.env.NODE_ENV === "development" && module.hot) {
        module.hot.accept(["./AudioApp", "./AudioSystem"], () => {
            renderApp(main === "SystemView" ? require("./AudioSystem").default : require("./AudioApp").default);
        });
    }
    return () => {
        try {
            root.unmount();
        } finally {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (rootElement as any)[globalRootKey];
        }
    };
};
if (!window.__UXP_PORTAL__) {
    initApplication(document);
}
