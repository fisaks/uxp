// PageRemoteApp.tsx
import { Loading } from "@uxp/ui-lib";
import React, { useCallback } from "react";
import axiosInstance from "../../app/axiosInstance";
import { useRemoteAppRuntime } from "./useRemoteAppRuntime";

type PageRemoteAppProps = {
    contentUuid: string;
    basePath?: string;
}

export const PageRemoteApp: React.FC<PageRemoteAppProps> = ({ contentUuid, basePath }) => {
    const fetchHtml = useCallback(async () => {
        const response = await axiosInstance.get(`/content/index/${contentUuid}`, {
            headers: { "Content-Type": "text/html" },
        });
        return response.data as string;
    }, [contentUuid]);

    const { containerRef, loaded } = useRemoteAppRuntime({
        fetchHtml,
        basePath,
        contentId: contentUuid,
        visible: true,
    });

    return (
        <>
            {!loaded && <Loading fullHeight={false} />}
            <div
                id={`remote-app-${contentUuid}`}
                ref={containerRef}
                style={{ visibility: loaded ? "visible" : "hidden" }}
            >
                {/* Shadow DOM will be attached here */}
            </div>
        </>
    );
};
