export type AppConfigData = {
    /**
      * Base path the remote app itself is mounted under.
      *
      * This is the app's own runtime path (UI + assets),
      * NOT the public UXP path.
      *
      * Used by the reverse proxy to map requests to the remote app.
      *
      * Example: "/h2c"
      */
    contextPath: string;
    /**
     * WebSocket path used by the remote app.
     *
     * By default, UXP assumes the WebSocket endpoint is:
     *   /{contextPath}/ws-api
     *
     * This value overrides only the trailing WebSocket path.
     * It is ALWAYS prefixed with `/{contextPath}/` by the reverse proxy,
     * so `contextPath` must NOT be included here.
     *
     * The value must match the remote app's root mount element
     * `data-ws-path` attribute.
     *
     * Example:
     *   wsPath: "ws"   →  /{contextPath}/ws
     */
    wsPath?: string;
    /**
     * Indicates whether the app's WebSocket connection is public (no auth required).
     */
    wsPublic?: boolean;
    /**
     * Main application entry point mounted by UXP.
     *
     * This HTML page represents the primary UI of the remote application
     * and is rendered when the user navigates to the app inside UXP.
     *
     * This field is required for every active app.
     */
    mainEntry: string;
    /**
     * Optional entry point used by UXP to mount a *faceless* UI for this app
     * in order to establish a persistent WebSocket connection for
     * health / status reporting.
     *
     * The referenced HTML page is expected to mount a minimal React root
     * (no visible UI) and include a `data-app-option` attribute, e.g.:
     *
     *   data-app-option='{"main": "HealthView"}'
     *
     * This entry point:
     * - is mounted independently of the main application UI
     * - allows the app to emit health/status events over WebSocket
     * - enables UXP to show system state even when the main UI is not open
     *
     * If not defined, the app does not participate in UXP health reporting.
     */
    healthEntry?: string;

    /**
     * Optional entry point used by UXP to mount the application's
     * System Center panel.
     *
     * This entry point is expected to render a *visible* UI that exposes
     * operational or diagnostic controls
     *
     * The System Center UI is rendered inside a UXP-managed
     * drawer or panel and may be mounted on demand.
     *
     * The referenced HTML page should include a `data-app-option`
     * attribute indicating the system root component, e.g.:
     *
     *   data-app-option='{"main": "SystemView"}'
     *
     * If not defined, the app does not expose a System Center UI.
     */
    systemEntry?: string;
    /**
     * Defines the sort order of the app in the system capabilities list. Lower numbers appear first.
     * If not defined, the app will be sorted alphabetically after the apps with defined sort order.
    */
    systemSortOrder?: number;
    
    /**
     * Additional options passed to the remote app via the root mount element.
     *
     * These are usually predefined in the remote app's `index.html`
     * as a `data-app-option` attribute.
     *
     * The reverse proxy injects / overrides this value as:
     *   data-app-option="<json>"
     *
     * Any existing `data-app-option` on the root element is overwritten.
     * The remote app is responsible for reading and interpreting the values.
     */
    appOption?: Record<string, string | boolean | number | object>;
};

export type PageAppsConfigData = Partial<AppConfigData> & {};

export type RouteConfigData = {
    redirect?: string;
};

export type PageMetaData<T = string> = Record<string, T>;

export type PageType = "fullWidth" | "leftNavigation";
export type PageConfigData = {
    pageType: PageType;
    routeLinkGroup?: string;
};
export type LocalizedStringValue = Record<string, string>;
