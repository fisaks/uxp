let BASE_URL_API: string;
let BASE_URL_STATIC: string;
let BASE_ROUTE_PATH: string | undefined;

export function initializeConfig(rootElement: HTMLElement | null) {
    if (!rootElement) {
        throw new Error("Root element is not provided or invalid.");
    }

    // Read data attributes from the root element
    const apiUrl = rootElement.getAttribute("data-base-url-api");
    const staticUrl = rootElement.getAttribute("data-base-url-static");
    const baseUrl = rootElement.getAttribute("data-base-url");
    const routePath = rootElement.getAttribute("data-base-route-path");

    if (!apiUrl || !staticUrl) {
        throw new Error("Base URLs are not defined in data attributes!");
    }

    // Assign the values to global variables
    BASE_URL_API = apiUrl;
    BASE_URL_STATIC = staticUrl;
    BASE_ROUTE_PATH = routePath ?? undefined;
    return baseUrl?.endsWith("/") ? baseUrl : baseUrl + "/";
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
export function getBaseRoutePath(): string | undefined {
    return BASE_ROUTE_PATH;
}
