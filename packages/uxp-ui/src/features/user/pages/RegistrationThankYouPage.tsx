import { Link, Typography } from "@mui/material";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { CenteredBox } from "@uxp/ui-lib";

const RegistrationThankYouPage: React.FC = () => {
    return (
        <CenteredBox maxWidth={600}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
                Thank You for Registering!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
                Your account has been successfully created, but it is not yet approved.
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
                You can log in, but your access is restricted until an administrator has approved your registration.
            </Typography>
            <Link component={RouterLink} to="/login" color="primary">
                Go to Login
            </Link>
        </CenteredBox>
    );
};

export default RegistrationThankYouPage;
