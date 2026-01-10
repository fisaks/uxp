
import { Box, Button, Divider, Typography } from "@mui/material";
import React from "react";

const UHNSystem: React.FC = () => {


    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1">UHN System</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
                Static placeholder content.
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Button variant="contained">Enable debug mode</Button>
                <Button variant="outlined">Restart runtime</Button>
                <Button variant="outlined">Recompile blueprint</Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2">Nodes</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
                🟢 Core service running<br />
                🔴 Edge: Sauna unreachable
            </Typography>
        </Box>


    );
};

export default UHNSystem;