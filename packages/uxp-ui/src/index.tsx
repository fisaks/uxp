import React from "react";
import ReactDOM from "react-dom/client"; // React 18's new API
import { Provider } from "react-redux";
import store from "./app/store";
import UxpApp from "./UxpApp";
//import './index.css'; // Optional: import a global CSS file

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
            <UxpApp />
        </Provider>
    </React.StrictMode>
);

declare const module: __WebpackModuleApi.Module;

if (process.env.NODE_ENV === "development" && module.hot) {
    module.hot.accept("./UxpApp", () => {
        const NextUxpApp = require("./UxpApp").default;
        root.render(
            <React.StrictMode>
                <Provider store={store}>
                    <NextUxpApp />
                </Provider>
            </React.StrictMode>
        );
    });
}