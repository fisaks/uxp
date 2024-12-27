let BASE_URL_API: string;
let BASE_URL_STATIC: string;

export function initializeConfig(rootElement: HTMLElement | null) {
    if (!rootElement) {
        throw new Error("Root element is not provided or invalid.");
    }

    // Read data attributes from the root element
    const apiUrl = rootElement.getAttribute("data-base-url-api");
    const staticUrl = rootElement.getAttribute("data-base-url-static");

    if (!apiUrl || !staticUrl) {
        throw new Error("Base URLs are not defined in data attributes!");
    }

    // Assign the values to global variables
    BASE_URL_API = apiUrl;
    BASE_URL_STATIC = staticUrl;
}

export function getBaseUrlApi(): string {
    if (!BASE_URL_API) {
        throw new Error("BASE_URL_API is not initialized. Call initializeConfig() first.");
    }
    return BASE_URL_API;
}

export function getBaseUrlStatic(): string {
    if (!BASE_URL_STATIC) {
        throw new Error("BASE_URL_STATIC is not initialized. Call initializeConfig() first.");
    }
    return BASE_URL_STATIC;
}
