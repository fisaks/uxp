import { Typography } from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";
import { selectIsLoggedInUser, selectUserRoles } from "../../features/user/userSelectors";

type MainContentProps = {};

const MainContent: React.FC<MainContentProps> = () => {
    const isLoggedInUser = useSelector(selectIsLoggedInUser());
    const userRoles = useSelector(selectUserRoles());

    return (<>

        {isLoggedInUser && userRoles.length === 0 ? (
            <Typography component="p">Your registration is pending approval. An admin needs to approve your registration before you can access the platform.</Typography>
        ) : (
            <>
                <Typography component="p">Welcome to the Unified Experience Platform (UXP)!</Typography>

                <Typography component="p" style={{ marginTop: "1rem" }}>
                    UXP is designed to provide a seamless and cohesive user experience by integrating multiple applications into a
                    single platform. With your assigned roles, you can access various features and functionalities tailored to your
                    needs. Explore the platform and take advantage of the unified interface.
                </Typography>
            </>
        )}
    </>
    );
};

export default MainContent;
