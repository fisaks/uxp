import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, CircularProgress } from "@mui/material";
import React, { useEffect } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useRequest } from "../shared/useRequest";

const SCAN_POLL_MS = 3000;

/** Looks at the music and audiobook folders again, which is what finds new files. It follows the scans while they run. */
export const ScanLibraries: React.FC = () => {
    const { sendMessageAsync } = useAudioWebSocket();
    const { data: library, reload: reloadLibrary } = useRequest("library_get_artists", {});
    const { data: books, reload: reloadBooks } = useRequest("audiobook_get_authors", {});
    const scanning = Boolean(library?.status.scanning || books?.status.scanning);

    // While a scan is running the lists grow, so they are asked for again until it is done.
    useEffect(() => {
        if (!scanning) return;
        const timer = setTimeout(() => {
            void reloadLibrary();
            void reloadBooks();
        }, SCAN_POLL_MS);
        return () => clearTimeout(timer);
    }, [scanning, library, books, reloadLibrary, reloadBooks]);

    const scan = async () => {
        await Promise.all([sendMessageAsync("library_scan", {}), sendMessageAsync("audiobook_scan", {})]);
        void reloadLibrary();
        void reloadBooks();
    };

    return (
        <Button onClick={scan} disabled={scanning} startIcon={scanning ? <CircularProgress size={18} /> : <RefreshIcon />} sx={{ mt: 2 }}>
            {scanning ? "Scanning the music folders..." : "Scan the music folders again"}
        </Button>
    );
};
