import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { selectAllRoutes } from "../navigation/navigationSelectors";
import RoutePage from "./RoutePage";

const UxpRoutes: React.FC = () => {
    const routes = useSelector(selectAllRoutes());

    return (
        <Routes>
            {routes.map((route) => (
                <Route
                    key={route.routePattern}
                    path={route.routePattern}
                    element={
                        route.config?.redirect ? (
                            <Navigate to={route.config?.redirect} />
                        ) : (
                            <RoutePage key={route.pageUuid!} pageUuid={route.pageUuid!} />
                        )
                    }
                />
            ))}
        </Routes>
    );
};

export default UxpRoutes;
