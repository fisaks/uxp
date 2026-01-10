import { assertNever, buildPath, isPathInRootPath, isWildcardRoutePattern, normalizeRoutePath } from "@uxp/common";
import { getUxpWindow } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectRoutesByIdentifierMap } from "./navigationSelectors";

export type UxpNavTarget =
    | { type: "route"; identifier: string; subPath?: string }
    | { type: "hash"; identifier: string; subPath?: string };


export const useUxpNavigate = () => {
    const routeLookup = useSelector(selectRoutesByIdentifierMap);
    const navigate = useNavigate();

    /**
     * Navigate based on a "cross-border" target coming from remote apps (health actions, etc.)
     */
    const navigateToTarget = useCallback(
        (target: UxpNavTarget) => {
            switch (target.type) {
                case "route": {
                    const route = routeLookup.get(target.identifier);
                    if (!route) {
                        console.warn(
                            "[UXP] Could not resolve route for identifier:",
                            target.identifier,
                            "Available routes:",
                            Array.from(routeLookup.keys())
                        );
                        return;
                    }

                    const subPath = target.subPath ?? "";
                    const currentPath = window.location.pathname;

                    // If current URL already belongs to this remote base route,
                    // only tell the active remote app to change its internal sub-route.
                    if (isWildcardRoutePattern(route.routePattern) &&
                        isPathInRootPath(currentPath, route.link ?? route.routePattern)) {

                        const rootPath = normalizeRoutePath(route.link ?? route.routePattern); // "/unified-home-network"
                        if (currentPath !== buildPath(rootPath, subPath)) { // "/unified-home-network/health"
                            getUxpWindow()?.navigation.updateRemoteSubRoute(rootPath, subPath);
                        }
                        return;
                    }
                    if (subPath) {
                        navigate(buildPath(route.link ?? route.routePattern, subPath));
                        return;
                    }
                    if (route.link) {
                        navigate(route.link);
                        return;
                    }
                    console.warn(
                        "[UXP] Route has no link defined for identifier:",
                        target.identifier,
                        "Route config:",
                        route
                    );
                    return;
                }

                case "hash": {
                    window.location.hash = `#${target.identifier}${target.subPath ? `/${target.subPath}` : ""}`;
                    return;
                }

                default:
                    assertNever(target);
            }
        },
        [routeLookup, navigate]
    );


    return navigateToTarget;
};
