// UserCard.tsx
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    IconButton,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    Typography,
    useTheme,
} from "@mui/material";
import { UserAdminView, UserRole } from "@uxp/common";
import { LoadingButton } from "@uxp/ui-lib";
import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";

interface UserCardProps {
    user: UserAdminView;

    userActions: {
        showAction?: (user: UserAdminView) => boolean;
        label: string;
        variant: "contained" | "outlined";
        color: "primary" | "secondary" | "error";
        onAction: (uuid: string, onDone: () => void) => void;
    }[];
    updateRoles?: (uuid: string, roles: UserRole[]) => void;
    expand: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, userActions, updateRoles, expand }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState<boolean>(expand);

    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});
    const [selectedRoles, setSelectedRoles] = useState(user.roles);

    useEffect(() => {
        setExpanded(expand);
    }, [expand]);
    const handleRoleEditToggle = () => {
        setIsEditingRoles(!isEditingRoles);
    };

    const handleRoleChange = (event: SelectChangeEvent<UserRole[]>) => {
        console.log("handleRoleChange", event.target.value);
        setSelectedRoles(event.target.value as UserRole[]);
        updateRoles && updateRoles(user.uuid, event.target.value as UserRole[]);
    };

    const handleAction = (label: string, action: (uuid: string, onDone: () => void) => void) => {
        setActionInProgress((value) => {
            value[label] = true;
            return { ...value };
        });

        action(user.uuid, () => {
            setActionInProgress((value) => {
                value[label] = false;
                return { ...value };
            });
        });
    };

    return (
        <Accordion
            expanded={expanded}
            onChange={() => setExpanded(!expanded)}
            elevation={0}
            sx={{
                backgroundColor: expanded ? theme.palette.action.hover : "transparent",
                boxShadow: expanded ? `0 0 5px ${theme.palette.primary.main}` : "none",
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel-${user.uuid}-content`}
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
                <Typography variant="h6">{`${user.firstName} ${user.lastName}`}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Paper
                    elevation={1}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">First Name</Typography>
                            <Typography>{user.firstName}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Last Name</Typography>
                            <Typography>{user.lastName}</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Username</Typography>
                            <Typography>{user.username}</Typography>
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Disabled</Typography>
                            <Typography>{user.isDisabled ? "Yes" : "No"}</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Roles</Typography>
                            <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                                {isEditingRoles ? (
                                    <Select<UserRole[]>
                                        multiple
                                        value={selectedRoles}
                                        onChange={handleRoleChange}
                                        onBlur={handleRoleEditToggle}
                                        sx={{ width: "100%" }}
                                    >
                                        <MenuItem value="admin">Admin</MenuItem>
                                        <MenuItem value="user">User</MenuItem>
                                    </Select>
                                ) : (
                                    <Typography>{user.roles.join(", ") || "None"}</Typography>
                                )}
                                {updateRoles && (
                                    <IconButton
                                        onClick={handleRoleEditToggle}
                                        aria-label={"Edit roles"}
                                        sx={{ marginLeft: 1 }}
                                    >
                                        {!isEditingRoles && <EditIcon />}
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Email</Typography>
                            <Typography>{user.email}</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Failed Logins</Typography>
                            <Typography>{user.failedLoginAttempts}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Token Version</Typography>
                            <Typography>{user.tokenVersion}</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Created</Typography>
                            <Typography>
                                {DateTime.fromISO(user.createdAt)
                                    .setLocale(navigator.language)
                                    .toLocaleString(DateTime.DATETIME_FULL)}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">Last Login</Typography>
                            <Typography>
                                {user.lastLogin
                                    ? DateTime.fromISO(user.lastLogin)
                                          .setLocale(navigator.language)
                                          .toLocaleString(DateTime.DATETIME_FULL)
                                    : "Never"}
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: `1px solid ${theme.palette.divider}`,
                            textAlign: "center",
                            display: "flex",
                            gap: 2,
                            justifyContent: "center",
                        }}
                    >
                        {userActions
                            .filter((f) => !f.showAction || f.showAction(user))
                            .map((userAction) => (
                                <LoadingButton
                                    key={userAction.label}
                                    variant={userAction.variant}
                                    color={userAction.color}
                                    onClick={() => handleAction(userAction.label, userAction.onAction)}
                                    isLoading={actionInProgress[userAction.label]}
                                    aria-label={`${userAction.label} ${user.firstName} ${user.lastName}`}
                                >
                                    {userAction.label}
                                </LoadingButton>
                            ))}
                    </Box>
                </Paper>
            </AccordionDetails>
        </Accordion>
    );
};

export default UserCard;
