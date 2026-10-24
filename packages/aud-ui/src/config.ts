let BASE_URL: string;
let BASE_ROUTE_PATH: string | undefined;
let UXP_CONTENT_ID: string | undefined;
let UXP_APP_IDENTIFIER: string | undefined;

export function initializeConfig(rootElement: HTMLElement | null) {
    if (!rootElement) {
        throw new Error("Root element is not provided or invalid.");
    }

    const baseUrl = rootElement.getAttribute("data-base-url");
    BASE_ROUTE_PATH = rootElement.getAttribute("data-base-route-path") ?? undefined;
    UXP_CONTENT_ID = rootElement.getAttribute("data-uxp-content-id") ?? undefined;
    UXP_APP_IDENTIFIER = rootElement.getAttribute("data-uxp-app-identifier") ?? undefined;

    if (!baseUrl) {
        throw new Error("Base URL is not defined in data attributes!");
    }

    BASE_URL = baseUrl;
    return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
}

export function getBaseUrl(): string {
    if (!BASE_URL) {
        throw new Error("BASE_URL is not initialized. Call initializeConfig() first.");
    }
    return BASE_URL;
}

export function getBaseRoutePath(): string | undefined {
    return BASE_ROUTE_PATH;
}
export function getUxpContentId(): string | undefined {
    return UXP_CONTENT_ID;
}
export function getUxpAppIdentifier(): string | undefined {
    return UXP_APP_IDENTIFIER;
}
