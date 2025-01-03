import React from "react";

const componentMap = {
    LoginPage: React.lazy(() => import(/* webpackChunkName: "login-page" */ "../user/pages/LoginPage")),
    RegisterPage: React.lazy(() => import(/* webpackChunkName: "register-page" */ "../user/pages/RegisterPage")),
    MyProfilePage: React.lazy(() => import(/* webpackChunkName: "my-profile-page" */ "../user/pages/ProfilePage")),
    MySettingsPage: React.lazy(() => import(/* webpackChunkName: "my-settings-page" */ "../settings/MySettingsPage")),
    StartPage: React.lazy(() => import(/* webpackChunkName: "start-page" */ "../../components/layout/MainContent")),
};

export default componentMap;
