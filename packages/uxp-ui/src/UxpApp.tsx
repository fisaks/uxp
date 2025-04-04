import { Loading } from "@uxp/ui-lib";
import React from "react";
import { BrowserRouter } from "react-router-dom";

import HeaderMenu from "./features/header/components/HeaderMenu";
import UxpRoutes from "./features/routes/UxpRoutes";
import { ThemeWrapper } from "./features/theme/ThemeWrapper";
import { useInitializeApp } from "./hooks";

const UxpAppLayout: React.FC = () => {
    return (
        <BrowserRouter>
            <HeaderMenu />

            <UxpRoutes />
        </BrowserRouter>
    );
};
const UxpApp: React.FC = () => {
    const loading = useInitializeApp();

    return loading ? (
        <Loading />
    ) : (
        <ThemeWrapper>
            <UxpAppLayout />
        </ThemeWrapper>
    );
};

export default UxpApp;
