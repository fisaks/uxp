import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom/client"; // React 18's new API
import { Provider } from "react-redux";
import { createStore } from "./app/store";
import { getAppOption, getUxpAppIdentifier, getUxpContentId, initializeConfig } from "./config";
import DemoApp from "./DemoApp";
import DemoView from "./DemoView";
const styleInsert = require("../../tools/src/insert-function.cjs");

const APPLICATIONS = {
    'DemoView': <DemoView />,
    'DemoApp': <DemoApp />
}
// Extend the Window interface to include __UXP_PORTAL__
declare const module: __WebpackModuleApi.Module;
// Get the root element in the HTML

//let hotRoot:ReactDOM.Root|undefined;

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

    styleInsert.init(container);
    // Create a custom Emotion cache
    const contentId = getUxpContentId();
    const appIdentifier = getUxpAppIdentifier();
    const shadowKey = `${appIdentifier}-${contentId}`.toLowerCase().replace(/[^a-z-]/g, '');
    const shadowCache = createCache({
        key: shadowKey,
        container: container,
    });

    // If you want to have shared state between remote apps, you can create a Redux store outside initApplication
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
    const appOption = getAppOption<{ main?: keyof typeof APPLICATIONS }>()
    const main: keyof typeof APPLICATIONS = appOption?.main ?? 'DemoApp';


    const App = APPLICATIONS[main];
    // Render the App component
    root.render(
        <React.StrictMode>
            <Provider store={store}>
                <CacheProvider value={shadowCache}>
                    {App}
                </CacheProvider>
            </Provider>
        </React.StrictMode>
    );
    if (process.env.NODE_ENV === "development" && module.hot) {
        module.hot.accept(`./${main}`, () => {
            const NextDemoApp = require(`./${main}`,).default;
            root.render(
                <React.StrictMode>
                    <Provider store={store}>
                        <CacheProvider value={shadowCache}>
                            <NextDemoApp />
                        </CacheProvider>
                    </Provider>
                </React.StrictMode>
            );
        });
    }
    return () => {
        try {
            root!.unmount();
        } finally {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (rootElement as any)[globalRootKey];
        }
    };
};
if (!window.__UXP_PORTAL__) {
    initApplication(document);
}
