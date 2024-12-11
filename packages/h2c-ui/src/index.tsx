import React from "react";
import ReactDOM from "react-dom/client"; // React 18's new API
import { Provider } from "react-redux";
import store from "./app/store";
import H2CApp from "./H2CApp";

// Get the root element in the HTML
const rootElement = document.getElementById("root");

// Ensure the root element exists before rendering
if (!rootElement) {
    throw new Error("Root element not found. Ensure you have an element with id 'root' in your HTML.");
}

// Create a React root
const root = ReactDOM.createRoot(rootElement);

// Render the App component
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <H2CApp />
        </Provider>
    </React.StrictMode>
);

declare const module: __WebpackModuleApi.Module;

if (process.env.NODE_ENV === "development" && module.hot) {
    module.hot.accept("./H2CApp", () => {
        const NextH2CApp = require("./H2CApp").default;
        root.render(
            <React.StrictMode>
                <Provider store={store}>
                    <NextH2CApp />
                </Provider>
            </React.StrictMode>
        );
    });
}
