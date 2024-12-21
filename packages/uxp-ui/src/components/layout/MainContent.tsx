import { Typography } from "@mui/material";
import React from "react";

type MainContentProps = {};

const MainContent: React.FC<MainContentProps> = () => {
    return (
        <Typography component="p">
            Welcome to your responsive layout. The header and sidebar adjust dynamically for mobile and desktop views.
        </Typography>
    );
};

export default MainContent;
