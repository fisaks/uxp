import { useMediaQuery } from "@mui/material";
import React, { useEffect, useState } from "react";
//import theme from "./theme";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loading, withLoading } from "./components";
import MainContent from "./components/layout/MainContent";
import PageWrapper from "./components/layout/PageWrapper";
import HeaderMenu from "./features/header/components/HeaderMenu";
import { selectIsLoading } from "./features/loading/loadingSelectors";
import MySettingsPage from "./features/settings/MySettingsPage";
import { ThemeWrapper } from "./features/theme/ThemeWrapper";
import { useUxpTheme } from "./features/theme/useUxpTheme";
import LoginPage from "./features/user/pages/LoginPage";
import ProfilePage from "./features/user/pages/ProfilePage";
import RegisterPage from "./features/user/pages/RegisterPage";
import RegistrationThankYouPage from "./features/user/pages/RegistrationThankYouPage";
import { selectCurrentUser } from "./features/user/userSelectors";
import { whoami } from "./features/user/userThunks";
import { useAppDispatch, useInitializeApp } from "./hooks";

type RoutesProps = {
    isDesktop: boolean;
};
const GuestRoutes: React.FC<RoutesProps> = () => {
    console.log("FFFFGuestRoutes");
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register-thank-you" element={<RegistrationThankYouPage />} />
            <Route path="/settings" element={<MySettingsPage />} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
};

const LoggedInRoutes: React.FC<RoutesProps> = ({ isDesktop }) => {
    return (
        <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-settings" element={<MySettingsPage />} />
            <Route path="*" element={<MainContent />} />
        </Routes>
    );
};

const UxpRoutes: React.FC<RoutesProps> = ({ isDesktop }) => {
    const user = useSelector(selectCurrentUser());
    console.log("FFFF", user);
    return (
        <PageWrapper isDesktop={isDesktop}>
            {!user ? <GuestRoutes isDesktop={isDesktop} /> : <LoggedInRoutes isDesktop={isDesktop} />}
        </PageWrapper>
    );
};
const UxpRoutesWithLoading = withLoading(UxpRoutes);

const UxpAppLayot: React.FC = () => {
    const theme = useUxpTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const headerMenuItems = ["Profile", "Settings", "Log Out"];
    const whoamiLoading = useSelector(selectIsLoading("user/whoami"));
    //    const sidebarMenuItems = ["Dashboard", "Reports", "Analytics", "Support"];
    //    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <BrowserRouter>
            <HeaderMenu isDesktop={isDesktop} />
            {/*
        <Sidebar
                    isDesktop={isDesktop}
                    sidebarOpen={sidebarOpen}
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    sidebarMenuItems={sidebarMenuItems}
                />
                    {!isDesktop && <FloatingSidebarButton toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
        */}
            <UxpRoutesWithLoading isLoading={whoamiLoading} isDesktop={isDesktop} />
        </BrowserRouter>
    );
};
const UxpApp: React.FC = () => {
    const dispatch = useAppDispatch();

    /*const [loading, setLoading] = useState(true);
    useEffect(() => {
        dispatch(whoami({})).then(() => setLoading(false));
    }, [dispatch, setLoading]);
*/
    const loading = useInitializeApp();
    console.log("FFFF loading", loading);
    return loading ? (
        <Loading />
    ) : (
        <ThemeWrapper>
            <UxpAppLayot />
        </ThemeWrapper>
    );
};

export default UxpApp;
