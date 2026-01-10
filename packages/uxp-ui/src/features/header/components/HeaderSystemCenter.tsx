import { useCallback, useEffect, useState } from "react";
import { UXP_HASH_CHANGED } from "../../navigation/useUxpNavigate";
import { SystemCenterButton } from "./SystemCenterButton";
import { SystemCenterDrawer } from "./SystemCenterDrawer";

export function parseSystemPanelHash(hash: string) {
    if (!hash.startsWith("#system-panel")) {
        return { open: false };
    }

    const [, appId] = hash.split("/");

    return {
        open: true,
        appId,
    };
}

export const HeaderSystemCenter = () => {
    const [systemCenterOpen, setSystemCenterOpen] = useState(false);
    const [targetAppId, setTargetAppId] = useState<string | undefined>();

    useEffect(() => {
        const applyHash = () => {
            console.log("Applying hash for System Center", window.location.hash);
            const parsed = parseSystemPanelHash(window.location.hash);

            if (!parsed.open) return;

            setSystemCenterOpen(true);
            setTargetAppId(parsed.appId);
        };

        applyHash();
        window.addEventListener(UXP_HASH_CHANGED, applyHash);
        // handles back and forward
        window.addEventListener("popstate", applyHash);
        return () => {
            window.removeEventListener(UXP_HASH_CHANGED, applyHash);
            window.removeEventListener("popstate", applyHash);
        };
    }, []);

    const closeSystemCenter = useCallback(() => {
        if (systemCenterOpen) {
            setSystemCenterOpen(false);
            setTargetAppId(undefined);
            //remove hash without reloading
            if (window.location.hash.startsWith("#system-panel"))
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
    }, [systemCenterOpen]);

    return (
        <>
            <SystemCenterButton onClick={() => setSystemCenterOpen(true)} />
            <SystemCenterDrawer
                open={systemCenterOpen}
                onClose={closeSystemCenter}
                targetAppId={targetAppId}
            />
        </>
    )
}