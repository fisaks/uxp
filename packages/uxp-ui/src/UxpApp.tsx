import { Loading, QUERY_PARAMS_PRINT_VIEW, useQuery } from "@uxp/ui-lib";
import React from "react";
import { BrowserRouter } from "react-router-dom";

import HeaderMenu from "./features/header/components/HeaderMenu";
import UxpRoutes from "./features/routes/UxpRoutes";
import { ThemeWrapper } from "./features/theme/ThemeWrapper";
import { useInitializeApp } from "./hooks";

const UxpAppLayout: React.FC = () => {
    const query = useQuery()
    const printView = query.get(QUERY_PARAMS_PRINT_VIEW) === "true";

    return (
        <>
            {!printView && <HeaderMenu />}

            <UxpRoutes />
        </>
    );
};
const UxpApp: React.FC = () => {
    const loading = useInitializeApp();

    return loading ? (
        <Loading />
    ) : (
        <ThemeWrapper>
            <BrowserRouter>
                <UxpAppLayout />
            </BrowserRouter>
        </ThemeWrapper>
    );
};

export default UxpApp;
