import { page, pageApp, route, routeTag, tag } from "./factories";

export const basePlatformConfig = {
    tags: [
        tag({ name: "header-menu" }),
        tag({ name: "profile-icon" }),
    ],
    pages: [
        page({ identifier: "login", name: "Login" }),
        page({ identifier: "register", name: "Register" }),
        page({ identifier: "register-thank-you", name: "RegisterThankYou" }),
        page({ identifier: "my-profile", name: "My Profile" }),
        page({ identifier: "my-settings", name: "My Settings" }),
        page({ identifier: "start-page", name: "Start Page" }),
        page({ identifier: "control-panel", name: "Control Panel" }),
    ],
    pageApps: [
        pageApp({ page: "login", internalComponent: "LoginPage", order: 1 }),
        pageApp({ page: "register", internalComponent: "RegisterPage", order: 1 }),
        pageApp({ page: "register-thank-you", internalComponent: "RegistrationThankYouPage", order: 1 }),
        pageApp({ page: "my-profile", internalComponent: "MyProfilePage", order: 1, roles: ["user"] }),
        pageApp({ page: "my-settings", internalComponent: "MySettingsPage", order: 1, roles: ["user"] }),
        pageApp({ page: "start-page", internalComponent: "StartPage", order: 1, roles: ["user"] }),
        pageApp({ page: "control-panel", internalComponent: "ControlPanelPage", order: 1, roles: ["admin"] }),
    ],
    routes: [
        route({ identifier: "login", routePattern: "/login", link: "/login", page: "login", accessType: "unauthenticated" }),
        route({ identifier: "register", routePattern: "/register", link: "/register", page: "register", accessType: "unauthenticated" }),
        route({ identifier: "register-thank-you", routePattern: "/register-thank-you", link: "/register-thank-you", page: "register-thank-you", accessType: "unauthenticated" }),
        route({ identifier: "my-profile", routePattern: "/my-profile", link: "/my-profile", page: "my-profile", accessType: "authenticated" }),
        route({ identifier: "my-settings", routePattern: "/my-settings", link: "/my-settings", page: "my-settings", accessType: "authenticated" }),
        route({ identifier: "start-page", routePattern: "/start", link: "/start", page: "start-page", accessType: "authenticated" }),
        route({ identifier: "control-panel-root", routePattern: "/control-panel/*", link: "/control-panel/", page: "control-panel", accessType: "role-based", roles: ["admin"] }),
        route({ identifier: "unauth-default", routePattern: "*", accessType: "unauthenticated", config: { redirect: "/login" } }),
        route({ identifier: "auth-default", routePattern: "*", accessType: "authenticated", config: { redirect: "/" } }),
    ],
    routeTags: [
        routeTag({ route: "auth-root", tag: "header-menu", routeOrder: 1 }),
        routeTag({ route: "my-settings", tag: "profile-icon", routeOrder: 1 }),
        routeTag({ route: "my-profile", tag: "profile-icon", routeOrder: 2 }),
        routeTag({ route: "control-panel-root", tag: "profile-icon", routeOrder: 3 }),
    ],
} as const;
