import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom/client"; // React 18's new API
import { Provider } from "react-redux";
import { createStore } from "./app/store";
import { initializeConfig } from "./config";
import DemoView from "./DemoView";
const styleInsert = require("../../tools/src/insert-function.cjs");

// Extend the Window interface to include __UXP_PORTAL__
declare const module: __WebpackModuleApi.Module;
// Get the root element in the HTML

//let hotRoot:ReactDOM.Root|undefined;

export const initApplication = (documentRoot: ShadowRoot | Document) => {
    const container = documentRoot instanceof Document ? documentRoot.head : documentRoot;
    const rootElement = documentRoot.getElementById("root");

    // Ensure the root element exists before rendering
    if (!rootElement) {
        throw new Error("Root element not found. Ensure you have an element with id 'root' in your HTML.");
    }
    __webpack_public_path__ = initializeConfig(rootElement) ?? "";
    console.log("public path", __webpack_public_path__);
    styleInsert.init(container);
    // Create a custom Emotion cache
    const shadowCache = createCache({
        key: `shadow`,
        container: container,
    });

    const store = createStore();

    // Create a React root
    // Store root globally to avoid duplicate createRoot calls

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const globalRootKey = "__UXP_APP_ROOT__";
    if (!(globalRootKey in rootElement)) {
        (rootElement as any)[globalRootKey] = ReactDOM.createRoot(rootElement);
    }

    const root = (rootElement as any)[globalRootKey];
    /* eslint-enable @typescript-eslint/no-explicit-any */
    //const root = ReactDOM.createRoot(rootElement);
    //let hotRoot=root;

    // Render the App component
    root.render(
        <React.StrictMode>
            <Provider store={store}>
                <CacheProvider value={shadowCache}>
                    <DemoView />
                </CacheProvider>
            </Provider>
        </React.StrictMode>
    );
    if (process.env.NODE_ENV === "development" && module.hot) {
        module.hot.accept("./DemoView", () => {
            const NextDemoView = require("./DemoView").default;
            root.render(
                <React.StrictMode>
                    <Provider store={store}>
                        <CacheProvider value={shadowCache}>
                            <NextDemoView />
                        </CacheProvider>
                    </Provider>
                </React.StrictMode>
            );
        });
    }
};
if (!window.__UXP_PORTAL__) {
    initApplication(document);
}
