import { useCallback, useEffect } from "react";
import { noopRequestBaseNavigation } from "../../app/uxpBrowserContract";
import { useUxpNavigate } from "./useUxpNavigate";

export const UxpRemoteNavigation = () => {
    const navigate = useUxpNavigate();

    const requestBaseNavigation = useCallback((type: string, identifier: string, subRoute?: string) => {
        if (type !== "route" && type !== "hash") {
            console.warn(
                `[UxpRemoteNavigation] Invalid navigation type "${type}" passed to requestBaseNavigation. Expected "route" or "hash".`
            );
            return;
        }
        navigate({ type: type as "route" | "hash", identifier, subPath: subRoute });

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