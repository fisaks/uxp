import { PaletteItem } from "./commandPalette.types";

/** Admin-only navigation and system items. */
export const navigationItems: PaletteItem[] = [
    {
        id: "nav:home",
        label: "Go to Home",
        group: "Navigation",
        searchText: "navigation go to home locations",
        action: { type: "navigate", to: "/" },
    },
    {
        id: "nav:technical",
        label: "Go to Technical",
        group: "Navigation",
        searchText: "navigation go to technical",
        action: { type: "navigate", to: "/technical" },
    },
    {
        id: "nav:resources",
        label: "Go to Resources",
        group: "Navigation",
        searchText: "navigation go to resources",
        action: { type: "navigate", to: "/technical/resources" },
    },
    {
        id: "nav:views",
        label: "Go to Views",
        group: "Navigation",
        searchText: "navigation go to views",
        action: { type: "navigate", to: "/technical/views" },
    },
    {
        id: "nav:scenes",
        label: "Go to Scenes",
        group: "Navigation",
        searchText: "navigation go to scenes",
        action: { type: "navigate", to: "/technical/scenes" },
    },
    {
        id: "nav:rules",
        label: "Go to Rules",
        group: "Navigation",
        searchText: "navigation go to rules",
        action: { type: "navigate", to: "/technical/rules" },
    },
    {
        id: "nav:blueprints",
        label: "Go to Blueprints",
        group: "Navigation",
        searchText: "navigation go to blueprints",
        action: { type: "navigate", to: "/technical/blueprints" },
    },
    {
        id: "nav:upload-blueprint",
        label: "Go to Upload Blueprint",
        group: "Navigation",
        searchText: "navigation go to upload blueprint",
        action: { type: "navigate", to: "/technical/blueprints/upload" },
    },
    {
        id: "nav:icon-preview",
        label: "Go to Icon Preview",
        group: "Navigation",
        searchText: "navigation go to icon preview icons",
        action: { type: "navigate", to: "/technical/blueprints/icons" },
    },
    {
        id: "nav:api-tokens",
        label: "Go to API Tokens",
        group: "Navigation",
        searchText: "navigation go to api tokens",
        action: { type: "navigate", to: "/technical/api-tokens" },
    },
    {
        id: "nav:topic-trace",
        label: "Go to Topic Trace",
        group: "Navigation",
        searchText: "navigation go to topic trace mqtt",
        action: { type: "navigate", to: "/technical/topic-trace" },
    },
    {
        id: "nav:system-panel",
        label: "Open System Panel",
        group: "Navigation",
        searchText: "navigation open system panel settings runtime debug health status connection",
        action: { type: "open-system-panel" },
    },
];

/** Quick action items available to all users. */
export const quickActionItems: PaletteItem[] = [
    {
        id: "qa:expand-all",
        label: "Expand all sections",
        group: "Quick Actions",
        searchText: "quick actions expand all sections open unfold",
        action: { type: "quick-action", action: "expand-all" },
    },
    {
        id: "qa:collapse-all",
        label: "Collapse all sections",
        group: "Quick Actions",
        searchText: "quick actions collapse all sections close fold",
        action: { type: "quick-action", action: "collapse-all" },
    },
    {
        id: "qa:refresh",
        label: "Refresh data",
        group: "Quick Actions",
        searchText: "quick actions refresh data reload sync",
        action: { type: "quick-action", action: "refresh" },
    },
    {
        id: "qa:scroll-to-top",
        label: "Scroll to top",
        group: "Quick Actions",
        searchText: "quick actions scroll to top go up",
        action: { type: "quick-action", action: "scroll-to-top" },
    },
    {
        id: "qa:clear-filter",
        label: "Clear filter",
        group: "Quick Actions",
        searchText: "quick actions clear filter search reset",
        action: { type: "quick-action", action: "clear-filter" },
    },
];
