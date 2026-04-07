import { PaletteItem } from "./commandPalette.types";

/** Navigation items available to all users. */
export const navigationItems: PaletteItem[] = [
    {
        id: "nav:home",
        label: "Go to Home",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to home locations",
        action: { type: "navigate", to: "/" },
    },
    {
        id: "nav:technical",
        label: "Go to Technical page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to technical",
        action: { type: "navigate", to: "/technical" },
    },
    {
        id: "nav:resources",
        label: "Go to Resources page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to resources",
        action: { type: "navigate", to: "/technical/resources" },
    },
    {
        id: "nav:views",
        label: "Go to Views page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to views",
        action: { type: "navigate", to: "/technical/views" },
    },
    {
        id: "nav:scenes",
        label: "Go to Scenes page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to scenes",
        action: { type: "navigate", to: "/technical/scenes" },
    },
    {
        id: "nav:rules",
        label: "Go to Rules page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to rules",
        action: { type: "navigate", to: "/technical/rules" },
    },
    {
        id: "nav:icon-preview",
        label: "Go to Icon Preview page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to icon preview icons",
        action: { type: "navigate", to: "/technical/blueprints/icons" },
    },
    {
        id: "nav:system-panel",
        label: "Open System Panel",
        group: "Navigation",
        searchText: "navigation navigate locate open page system panel settings runtime debug health status connection",
        action: { type: "open-system-panel" },
    },
];

/** Admin-only navigation items. */
export const adminNavigationItems: PaletteItem[] = [
    {
        id: "nav:blueprints",
        label: "Go to Blueprints page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to blueprints",
        action: { type: "navigate", to: "/technical/blueprints" },
    },
    {
        id: "nav:upload-blueprint",
        label: "Go to Upload Blueprint page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to upload blueprint",
        action: { type: "navigate", to: "/technical/blueprints/upload" },
    },
    {
        id: "nav:api-tokens",
        label: "Go to API Tokens page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to api tokens",
        action: { type: "navigate", to: "/technical/api-tokens" },
    },
    {
        id: "nav:topic-trace",
        label: "Go to Topic Trace page",
        group: "Navigation",
        searchText: "navigation navigate locate open page go to topic trace mqtt",
        action: { type: "navigate", to: "/technical/topic-trace" },
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
