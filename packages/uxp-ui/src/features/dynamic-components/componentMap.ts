import React from "react";

/**
 * Map of dynamically loadable UXP internal components.
 *
 * Keys in this map are referenced by `PageAppsEntity.internalComponent`
 * and are used to render local UXP content on a page.
 *
 * If a key is not present here, the component cannot be rendered.
 */
const componentMap = {
    LoginPage: React.lazy(() => import(/* webpackChunkName: "login-page" */ "../user/pages/LoginPage")),
    RegisterPage: React.lazy(() => import(/* webpackChunkName: "register-page" */ "../user/pages/RegisterPage")),
    RegistrationThankYouPage: React.lazy(() => import(/* webpackChunkName: "register-page" */ "../user/pages/RegistrationThankYouPage")),
    MyProfilePage: React.lazy(() => import(/* webpackChunkName: "my-profile-page" */ "../user/pages/ProfilePage")),
    MySettingsPage: React.lazy(() => import(/* webpackChunkName: "my-settings-page" */ "../settings/MySettingsPage")),
    StartPage: React.lazy(() => import(/* webpackChunkName: "start-page" */ "../../components/layout/MainContent")),
    ControlPanelPage: React.lazy(() => import(/* webpackChunkName: "control-panel-page" */ "../control-panel/pages/ControlPanelPage")),
};

export default componentMap;
