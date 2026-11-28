import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, CircularProgress } from "@mui/material";
import React from "react";
import { useScanLibraryMutation } from "../movie/movie.api";
import { useAppSelector } from "../../hooks";
import { selectScanning } from "../library/librarySelectors";

/** Looks at the media folders again, which is what finds new files. The server tells over the WebSocket when the scan starts and ends. */
export const ScanLibrary: React.FC = () => {
    const [scanLibrary, { isLoading }] = useScanLibraryMutation();
    const scanning = useAppSelector(selectScanning);
    const busy = isLoading || scanning;

    return (
        <Button onClick={() => void scanLibrary()} disabled={busy} startIcon={busy ? <CircularProgress size={18} /> : <RefreshIcon />} sx={{ mt: 2 }}>
            {busy ? "Scanning the media folders..." : "Scan the media folders again"}
        </Button>
    );
};
