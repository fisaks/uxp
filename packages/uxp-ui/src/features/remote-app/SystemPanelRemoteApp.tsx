// SystemPanelRemoteApp.tsx
import { Loading } from "@uxp/ui-lib";
import React, { useCallback } from "react";
import axiosInstance from "../../app/axiosInstance";
import { useRemoteAppRuntime } from "./useRemoteAppRuntime";

export const SystemPanelRemoteApp: React.FC<{ appIdentifier: string }> = ({ appIdentifier }) => {
    const fetchHtml = useCallback(async () => {
        const response = await axiosInstance.get(`/system/index/${appIdentifier}/system`, {
            headers: { "Content-Type": "text/html" },
        });
        return response.data as string;
    }, [appIdentifier]);

    const { containerRef, loaded } = useRemoteAppRuntime({
        fetchHtml,
        visible: true,
    });

    return (
        <>
            {!loaded && <Loading fullHeight={false} />}
            <div id={`remote-app-system-${appIdentifier}`} ref={containerRef} />
        </>
    );
};
