import { useMediaQuery, useTheme } from "@mui/material";
import { AppBodyContent, LeftSideBar, QUERY_PARAMS_PRINT_VIEW, SidebarMenuItems, useQuery } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import { DocumentPrintPreviewPage } from "./features/document/DocumentPrintPreviewPage";
import HouseInfoPage from "./features/house/pages/HouseInfoPage";
import { HousePrintPreviewPage } from "./features/house/pages/HousePrintPreviewPage";

export const H2CBody = () => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();
    const basePath = useMemo(() => getBaseRoutePath(), []);
    const query = useQuery()
    const printView = query.get(QUERY_PARAMS_PRINT_VIEW) === "true";
    const menuItems: SidebarMenuItems[] = useMemo(() => {
        return [
            {
                label: "House Management",
                link: "/house-info",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/house-info" || location.pathname === "/",
            },

        ];
    }, [basePath, location.pathname]);

    return (
        <>
            {!printView && <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />}
            <AppBodyContent appHaveOwnLeftSideBar={!printView}>
                <Routes>
                    <Route path="/house-info" element={<HouseInfoPage />} />
                    <Route path="/house-info/preview/:houseId/:version" element={<HousePrintPreviewPage />} />
                    <Route path="/document-preview/:documentId/:version" element={<DocumentPrintPreviewPage />} />
                    <Route path="*" element={<HouseInfoPage />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
