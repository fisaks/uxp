import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { ShadowRootProvider } from "@uxp/ui-lib";
import React from "react";
import ReactDOM from "react-dom/client"; // React 18's new API
import { Provider } from "react-redux";
import { createStore } from "./app/store";
import { initializeConfig } from "./config";
import UHNApp from "./UHNApp";
const styleInsert = require("../../tools/src/insert-function.cjs");

// Extend the Window interface to include __UXP_PORTAL__
declare const module: __WebpackModuleApi.Module;
// Get the root element in the HTML

//let hotRoot:ReactDOM.Root|undefined;

const ENABLE_STRICT_MODE = false;


export const initApplication = (documentRoot: ShadowRoot | Document) => {
    const container = documentRoot instanceof Document ? documentRoot.head : documentRoot;
    const rootElement = documentRoot.getElementById("root");
    if (!(documentRoot as Document).createRange) {
        (documentRoot as Document).createRange = () => {
            const range = document.createRange(); // createRange is used by tiptap and shadow dom don't have it
            range.selectNodeContents(documentRoot);
            return range;
        }
    }
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
    const globalRootKey = "__UXP_APP_ROOT__";
    if (!(globalRootKey in rootElement)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (rootElement as any)[globalRootKey] = ReactDOM.createRoot(rootElement);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = (rootElement as any)[globalRootKey];
    //const root = ReactDOM.createRoot(rootElement);
    //let hotRoot=root;

    // Render the App component
    const renderApp = (AppComponent: React.ComponentType) => {
        const AppTree = (
            <Provider store={store}>
                <CacheProvider value={shadowCache}>
                    <ShadowRootProvider documentRoot={documentRoot}>
                        <AppComponent />
                    </ShadowRootProvider>
                </CacheProvider>
            </Provider>
        );

        const RootApp = ENABLE_STRICT_MODE ? (
            <React.StrictMode>{AppTree}</React.StrictMode>
        ) : (
            AppTree
        );

        root.render(RootApp);
    }
    renderApp(UHNApp);

    if (process.env.NODE_ENV === "development" && module.hot) {
        module.hot.accept("./UHNApp", () => {
            const NextUHNApp = require("./UHNApp").default;
            renderApp(NextUHNApp);
        });
    }

};
if (!window.__UXP_PORTAL__) {
    initApplication(document);
}
