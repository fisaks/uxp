import { isSameRoutePath, UserPublic } from "@uxp/common";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const UXP_NAVIGATION_EVENT = "uxpNavigation";
export type UxpNavigationEvent = CustomEvent<{ rootPath: string; subRoute: string }>;
type RemoteNavigationListenerProps = {
    locationRoot?: string;
};
export const RemoteNavigationListener = ({ locationRoot }: RemoteNavigationListenerProps) => {
    const navigate = useNavigate()

    useEffect(() => {
        const handleNavigation = (event: Event) => {
            console.log("Received navigation event from UXP host");
            // Handle navigation notification from UXP host if needed
            const navigationEvent = event as UxpNavigationEvent;
            const { rootPath, subRoute } = navigationEvent.detail;

            if (locationRoot && isSameRoutePath(locationRoot, rootPath)) {
                console.log(" navigation subRoute:", subRoute, locationRoot);
                navigate(subRoute ?? "/", { replace: false });
            }

        }
        window.addEventListener(UXP_NAVIGATION_EVENT, handleNavigation);

        return () => {
            // Clean up the event listener
            window.removeEventListener(UXP_NAVIGATION_EVENT, handleNavigation);
        };

    }, [navigate, locationRoot]);


    return null;
};
