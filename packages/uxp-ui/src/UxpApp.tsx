import { useMediaQuery } from "@mui/material";
import { Loading } from "@uxp/ui-lib";
import React from "react";
import { BrowserRouter } from "react-router-dom";

import { PageWrapper } from "./components";
import HeaderMenu from "./features/header/components/HeaderMenu";
import UxpRoutes from "./features/routes/UxpRoutes";
import { ThemeWrapper } from "./features/theme/ThemeWrapper";
import { useUxpTheme } from "./features/theme/useUxpTheme";
import { useAppDispatch, useInitializeApp } from "./hooks";

const UxpAppLayot: React.FC = () => {
    const theme = useUxpTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    //const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    //const headerMenuItems = ["Profile", "Settings", "Log Out"];
    //const whoamiLoading = useSelector(selectIsLoading("user/whoami"));
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
            <PageWrapper isDesktop={isDesktop}>
                <UxpRoutes />
            </PageWrapper>
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
