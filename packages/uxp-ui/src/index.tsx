import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom/client"; // React 18's new API
import { Provider } from "react-redux";
import store from "./app/store";
import UxpApp from "./UxpApp";
import "./app/remoteAppBroadcaster";
//import './index.css'; // Optional: import a global CSS file

// Get the root element in the HTML
const rootElement = document.getElementById("root");


const ENABLE_STRICT_MODE = true;

// Ensure the root element exists before rendering
if (!rootElement) {
    throw new Error("Root element not found. Ensure you have an element with id 'root' in your HTML.");
}

// Create a React root
const root = ReactDOM.createRoot(rootElement);

const cache = createCache({ key: "uxp", prepend: true });

// Render the App component
const renderApp = (AppComponent: React.ComponentType) => {
    const AppTree = (
        <CacheProvider value={cache}>
            <Provider store={store}>
                {ENABLE_STRICT_MODE ? <React.StrictMode><AppComponent /></React.StrictMode> : <AppComponent />}
            </Provider>
        </CacheProvider>
    );

    root.render(AppTree);
}
renderApp(UxpApp);


declare const module: __WebpackModuleApi.Module;

if (process.env.NODE_ENV === "development" && module.hot) {
    module.hot.accept("./UxpApp", () => {
        const NextUxpApp = require("./UxpApp").default;
          renderApp(NextUxpApp);
    });
}
