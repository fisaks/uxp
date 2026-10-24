import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { getBaseUrl } from "../config";

type BffState = "checking" | "ok" | "error";

const StatusPage: React.FC = () => {
    const [bffState, setBffState] = useState<BffState>("checking");

    useEffect(() => {
        axios
            .get(`${getBaseUrl()}/api/status`)
            .then(() => setBffState("ok"))
            .catch(() => setBffState("error"));
    }, []);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                AUD
            </Typography>
            {bffState === "checking" && <CircularProgress size={24} />}
            {bffState === "ok" && <Alert severity="success">Backend connected</Alert>}
            {bffState === "error" && <Alert severity="error">Backend not reachable</Alert>}
        </Box>
    );
};

export default StatusPage;
