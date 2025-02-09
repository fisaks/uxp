import { List, ListItem, ListItemText } from "@mui/material";
import React from "react";
import { NavLink, useResolvedPath } from "react-router-dom";

const Navigation: React.FC = () => {
    const resolvedPath = useResolvedPath("house-info", { relative: "path" });
    return (
        <List>
            <ListItem component={NavLink} to={resolvedPath} relative="path">
                <ListItemText primary="House Management" />
            </ListItem>
        </List>
    );
};

export default Navigation;
