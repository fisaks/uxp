import { defineConfig, basePlatformConfig, globalConfig } from "@uxp/config";

const REMOTE_HOST_H2C = process.env.REMOTE_HOST_H2C ?? "http://localhost:3010";
const REMOTE_HOST_DEMO = process.env.REMOTE_HOST_DEMO ?? "http://localhost:3020";
const REMOTE_HOST_UHN = process.env.REMOTE_HOST_UHN ?? "http://localhost:3030";

export default defineConfig({
    tags: [
        ...basePlatformConfig.tags,
        { name: "demo-links" },
    ],
    apps: [
        { name: "H2C", baseUrl: REMOTE_HOST_H2C, config: { contextPath: "/h2c", mainEntry: "index.html" } },
        { name: "uxp-demo", baseUrl: REMOTE_HOST_DEMO, config: { contextPath: "/demo", mainEntry: "index.html" } },
        { name: "UHN", baseUrl: REMOTE_HOST_UHN, config: {
            contextPath: "/uhn", mainEntry: "index.html",
            healthEntry: "health.html", systemEntry: "system.html",
        }},
    ],
    pages: [
        ...basePlatformConfig.pages,
        { identifier: "home-2-care", name: "Home 2 Care" },
        { identifier: "uxp-demo-page", name: "UXP Nav Demo", config: { pageType: "leftNavigation", routeLinkGroup: "demo-links" } },
        { identifier: "multi-app-page", name: "Multiple Apps Demo", config: { pageType: "leftNavigation", routeLinkGroup: "demo-links" } },
        { identifier: "self-nav-app-page", name: "Self Nav Demo" },
        { identifier: "unified-home-network", name: "Unified Home Network" },
    ],
    pageApps: [
        ...basePlatformConfig.pageApps,
        { page: "home-2-care", app: "H2C", order: 1, roles: ["user"] },
        { page: "uxp-demo-page", app: "uxp-demo", order: 1, roles: ["user"], config: { mainEntry: "view.html" } },
        { page: "self-nav-app-page", app: "uxp-demo", order: 1, roles: ["user"] },
        { page: "multi-app-page", app: "uxp-demo", order: 1, roles: ["user"], config: { mainEntry: "view.html" } },
        { page: "multi-app-page", app: "uxp-demo", order: 2, roles: ["user"], config: { mainEntry: "view.html" } },
        { page: "unified-home-network", app: "UHN", order: 1, roles: ["user"] },
    ],
    routes: [
        ...basePlatformConfig.routes,
        { identifier: "auth-root", routePattern: "/", link: "/", page: "start-page", accessType: "authenticated" },
        { identifier: "home-2-care", routePattern: "/home-2-care/*", link: "/home-2-care/", page: "home-2-care", accessType: "role-based", roles: ["user"] },
        { identifier: "demo-app-multi-app", routePattern: "/demo-app/multi-app", link: "/demo-app/multi-app", page: "multi-app-page", accessType: "role-based", roles: ["user"] },
        { identifier: "demo-app", routePattern: "/demo-app/*", link: "/demo-app/", page: "uxp-demo-page", accessType: "role-based", roles: ["user"] },
        { identifier: "self-nav-demo-app", routePattern: "/self-nav-demo/*", link: "/self-nav-demo/", page: "self-nav-app-page", accessType: "role-based", roles: ["user"] },
        { identifier: "unified-home-network", routePattern: "/unified-home-network/*", link: "/unified-home-network/", page: "unified-home-network", accessType: "role-based", roles: ["user"] },
    ],
    routeTags: [
        ...basePlatformConfig.routeTags,
        { route: "home-2-care", tag: "header-menu", routeOrder: 2 },
        { route: "demo-app", tag: "header-menu", routeOrder: 3 },
        { route: "self-nav-demo-app", tag: "header-menu", routeOrder: 4 },
        { route: "unified-home-network", tag: "header-menu", routeOrder: 5 },
        { route: "demo-app", tag: "demo-links", routeOrder: 1 },
        { route: "demo-app-multi-app", tag: "demo-links", routeOrder: 2 },
    ],
    globalConfig: globalConfig({
        siteName: { value: "UXP Dev", managed: true },
    }),
});
