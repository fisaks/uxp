import { defineConfig, basePlatformConfig, tag, app, page, pageApp, route, routeTag, globalConfig } from "@uxp/config";

const REMOTE_HOST_H2C = process.env.REMOTE_HOST_H2C ?? "http://localhost:3010";
const REMOTE_HOST_DEMO = process.env.REMOTE_HOST_DEMO ?? "http://localhost:3020";
const REMOTE_HOST_UHN = process.env.REMOTE_HOST_UHN ?? "http://localhost:3030";

export default defineConfig({
    tags: [
        ...basePlatformConfig.tags,
        tag({ name: "demo-links" }),
    ],
    apps: [
        app({ name: "H2C", baseUrl: REMOTE_HOST_H2C, config: { contextPath: "/h2c", mainEntry: "index.html" } }),
        app({ name: "uxp-demo", baseUrl: REMOTE_HOST_DEMO, config: { contextPath: "/demo", mainEntry: "index.html" } }),
        app({ name: "UHN", baseUrl: REMOTE_HOST_UHN, config: {
            contextPath: "/uhn", mainEntry: "index.html",
            healthEntry: "health.html", systemEntry: "system.html",
        }}),
    ],
    pages: [
        ...basePlatformConfig.pages,
        page({ identifier: "home-2-care", name: "Home 2 Care" }),
        page({ identifier: "uxp-demo-page", name: "UXP Nav Demo", config: { pageType: "leftNavigation", routeLinkGroup: "demo-links" } }),
        page({ identifier: "multi-app-page", name: "Multiple Apps Demo", config: { pageType: "leftNavigation", routeLinkGroup: "demo-links" } }),
        page({ identifier: "self-nav-app-page", name: "Self Nav Demo" }),
        page({ identifier: "unified-home-network", name: "Unified Home Network" }),
    ],
    pageApps: [
        ...basePlatformConfig.pageApps,
        pageApp({ page: "home-2-care", app: "H2C", order: 1, roles: ["user"] }),
        pageApp({ page: "uxp-demo-page", app: "uxp-demo", order: 1, roles: ["user"], config: { mainEntry: "view.html" } }),
        pageApp({ page: "self-nav-app-page", app: "uxp-demo", order: 1, roles: ["user"] }),
        pageApp({ page: "multi-app-page", app: "uxp-demo", order: 1, roles: ["user"], config: { mainEntry: "view.html" } }),
        pageApp({ page: "multi-app-page", app: "uxp-demo", order: 2, roles: ["user"], config: { mainEntry: "view.html" } }),
        pageApp({ page: "unified-home-network", app: "UHN", order: 1, roles: ["user"] }),
    ],
    routes: [
        ...basePlatformConfig.routes,
        route({ identifier: "auth-root", routePattern: "/", link: "/", page: "start-page", accessType: "authenticated" }),
        route({ identifier: "home-2-care", routePattern: "/home-2-care/*", link: "/home-2-care/", page: "home-2-care", accessType: "role-based", roles: ["user"] }),
        route({ identifier: "demo-app-multi-app", routePattern: "/demo-app/multi-app", link: "/demo-app/multi-app", page: "multi-app-page", accessType: "role-based", roles: ["user"] }),
        route({ identifier: "demo-app", routePattern: "/demo-app/*", link: "/demo-app/", page: "uxp-demo-page", accessType: "role-based", roles: ["user"] }),
        route({ identifier: "self-nav-demo-app", routePattern: "/self-nav-demo/*", link: "/self-nav-demo/", page: "self-nav-app-page", accessType: "role-based", roles: ["user"] }),
        route({ identifier: "unified-home-network", routePattern: "/unified-home-network/*", link: "/unified-home-network/", page: "unified-home-network", accessType: "role-based", roles: ["user"] }),
    ],
    routeTags: [
        ...basePlatformConfig.routeTags,
        routeTag({ route: "home-2-care", tag: "header-menu", routeOrder: 2 }),
        routeTag({ route: "demo-app", tag: "header-menu", routeOrder: 3 }),
        routeTag({ route: "self-nav-demo-app", tag: "header-menu", routeOrder: 4 }),
        routeTag({ route: "unified-home-network", tag: "header-menu", routeOrder: 5 }),
        routeTag({ route: "demo-app", tag: "demo-links", routeOrder: 1 }),
        routeTag({ route: "demo-app-multi-app", tag: "demo-links", routeOrder: 2 }),
    ],
    globalConfig: globalConfig({
        siteName: { value: "UXP Dev", managed: true },
    }),
});
