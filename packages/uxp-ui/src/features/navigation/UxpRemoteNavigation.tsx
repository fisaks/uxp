import { useCallback, useEffect } from "react";
import { noopRequestBaseNavigation } from "../../app/uxpBrowserContract";
import { useUxpNavigate } from "./useUxpNavigate";

export const UxpRemoteNavigation = () => {
    const navigate = useUxpNavigate();

    const requestBaseNavigation = useCallback((routeIdentifier: string, subRoute?: string) => {
        navigate({ type: "route", identifier: routeIdentifier, subPath: subRoute })

    }, [navigate]);
    useEffect(() => {
        if (window.uxp?.navigation) {
            window.uxp.navigation.requestBaseNavigation = requestBaseNavigation;
        }
        return () => {
            if (window.uxp?.navigation) {
                window.uxp.navigation.requestBaseNavigation = noopRequestBaseNavigation;
            }
        };
    }, [requestBaseNavigation]);
    return null;
}