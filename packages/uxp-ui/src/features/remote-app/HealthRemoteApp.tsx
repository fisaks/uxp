// HealthRemoteApp.tsx
import React, { useCallback } from "react";
import axiosInstance from "../../app/axiosInstance";
import { useRemoteAppRuntime } from "./useRemoteAppRuntime";

export const HealthRemoteApp: React.FC<{ appIdentifier: string }> = ({ appIdentifier }) => {
    const fetchHtml = useCallback(async () => {
        const response = await axiosInstance.get(`/system/index/${appIdentifier}/health`, {
            headers: { "Content-Type": "text/html" },
        });
        return response.data as string;
    }, [appIdentifier]);

    const { containerRef } = useRemoteAppRuntime({
        fetchHtml,
        visible: false,
    });

    // faceless host
    return <div id={`remote-app-health-${appIdentifier}`} ref={containerRef} style={{ display: "none" }} />;
};
