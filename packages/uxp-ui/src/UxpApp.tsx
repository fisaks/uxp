import { Loading } from "@uxp/ui-lib";
import React from "react";
import { BrowserRouter } from "react-router-dom";

import HeaderMenu from "./features/header/components/HeaderMenu";
import UxpRoutes from "./features/routes/UxpRoutes";
import { ThemeWrapper } from "./features/theme/ThemeWrapper";
import { useAppDispatch, useInitializeApp } from "./hooks";

const UxpAppLayot: React.FC = () => {
    return (
        <BrowserRouter>
            <HeaderMenu />

            <UxpRoutes />
        </BrowserRouter>
    );
};
const UxpApp: React.FC = () => {
    const dispatch = useAppDispatch();

    const loading = useInitializeApp();

    return loading ? (
        <Loading />
    ) : (
        <ThemeWrapper>
            <UxpAppLayot />
        </ThemeWrapper>
    );
};

export default UxpApp;
