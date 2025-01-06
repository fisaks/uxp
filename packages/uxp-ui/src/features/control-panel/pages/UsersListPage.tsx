import { Box, Typography } from "@mui/material";
import React from "react";

const UsersListPage: React.FC = () => {
    return (
        <Box>
            <Typography variant="h2" component="h2">
                Users List
            </Typography>

            <Typography component="p">Manage the list of users here.</Typography>
        </Box>
    );
};

export default UsersListPage;
