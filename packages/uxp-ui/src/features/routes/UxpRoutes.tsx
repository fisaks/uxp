import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { selectAllRoutes } from "../navigation/navigationSelectors";
import RoutePage from "./RoutePage";

const getBasePath = (routePattern: string) => {
    const match = routePattern.match(/^(.*)\*$/);
    return match ? match[1] : undefined;
};
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
                            <RoutePage key={route.pageIdentifier!} pageIdentifier={route.pageIdentifier!} basePath={getBasePath(route.routePattern)} />
                        )
                    }
                />
            ))}
        </Routes>
    );
};

export default UxpRoutes;
