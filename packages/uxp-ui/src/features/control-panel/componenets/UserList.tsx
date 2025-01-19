// UserList.tsx
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import { Box, Card, CardContent, IconButton, List, Typography, useTheme } from "@mui/material";
import { UserAdminView, UserRole } from "@uxp/common";
import { withErrorHandler, withLoading } from "@uxp/ui-lib";
import React, { useState } from "react";
import UserCard from "./UserCard";

type UserListProps = {
    users: UserAdminView[];
    userActions: {
        showAction?: (user: UserAdminView) => boolean;
        label: string;
        variant: "contained" | "outlined";
        color: "primary" | "secondary" | "error";
        onAction: (uuid: string, onDone: () => void) => void;
    }[];
    updateRoles?: (uuid: string, roles: UserRole[]) => void;
};

const UserList: React.FC<UserListProps> = ({ users, userActions, updateRoles }) => {
    const [expandAll, setExpandAll] = useState<boolean>(false);
    const theme = useTheme();
    const handleExpandAllToggle = () => {
        setExpandAll(!expandAll);
    };
    return users.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: "center", mt: 4 }}>
            No new user requests at this time.
        </Typography>
    ) : (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2, mr: 3 }}>
                <IconButton
                    onClick={handleExpandAllToggle}
                    aria-label={expandAll ? "Collapse all user details" : "Expand all user details"}
                >
                    {expandAll ? <KeyboardDoubleArrowUpIcon /> : <KeyboardDoubleArrowDownIcon />}
                </IconButton>
            </Box>
            <List>
                {users.map((user) => (
                    <Card
                        key={user.uuid}
                        sx={{
                            marginBottom: 2,
                            borderRadius: 2,
                            boxShadow: 3,
                            ...(user.isDisabled ? { background: theme.palette.error.dark } : {}),
                        }}
                    >
                        <CardContent>
                            <UserCard
                                user={user}
                                userActions={userActions}
                                updateRoles={updateRoles}
                                expand={expandAll}
                            />
                        </CardContent>
                    </Card>
                ))}
            </List>
        </Box>
    );
};
const ExportedUserList = withLoading(withErrorHandler(UserList));

export default ExportedUserList;
