import { Alert, Box, Typography } from "@mui/material";
import { VidStatus } from "@vid/common";
import { AppBodyContent } from "@uxp/ui-lib";
import axios from "axios";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getBaseUrl } from "./config";

const HOME_PATH = "/";

/** The first page: asks the server whether it can see the folder with the videos. */
const HomePage = () => {
    const [status, setStatus] = useState<VidStatus>();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        axios
            .get<VidStatus>(`${getBaseUrl().replace(/\/$/, "")}/api/status`)
            .then(({ data }) => setStatus(data))
            .catch(() => setFailed(true));
    }, []);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Video
            </Typography>
            {failed && <Alert severity="error">The video server cannot be reached</Alert>}
            {status && (
                <Alert severity={status.mediaRootAvailable ? "success" : "warning"}>
                    {status.mediaRootAvailable ? "The video server is running" : "The video server cannot read the folder with the videos"}
                </Alert>
            )}
        </Box>
    );
};

export const VidBody = () => (
    <AppBodyContent appHaveOwnLeftSideBar={false}>
        <Routes>
            <Route path={HOME_PATH} element={<HomePage />} />
            <Route path="*" element={<Navigate to={HOME_PATH} replace={true} />} />
        </Routes>
    </AppBodyContent>
);
