import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    List,
    Pagination,
    Paper,
    Typography,
    useTheme,
} from "@mui/material";
import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../hooks";
import { selectError } from "../../error/errorSelectors";
import { selectIsLoading } from "../../loading/loadingSelectors";
import { selectUSerSearchPagination, selectUserSearchResult } from "../userSearchSelectors";
import { searchUsers } from "../userSearchThunk";

const NewUserRequestsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const users = useSelector(selectUserSearchResult);
    const loading = useSelector(selectIsLoading("user/search"));
    const error = useSelector(selectError("user/search"));
    const pagination = useSelector(selectUSerSearchPagination);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    useEffect(() => {
        /*dispatch(searchUsers({
            pagination: { page: 1, size: 10 },
            filters: [{ field: "roles", operator: "eq", value: "" }],
            sort: { field: "createdAt", direction: "asc" }
        }));*/
        dispatch(searchUsers({ pagination: { page: 1, size: 10 }, sort: { field: "createdAt", direction: "asc" } }));
    }, [dispatch]);

    const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
        dispatch(searchUsers({ pagination: { page, size: 10 } }));
    };

    const handleExpand = (uuid: string) => {
        setExpandedUser(expandedUser === uuid ? null : uuid);
    };
    const handleApprove = (uuid: string) => {
        // Dispatch an action or make an API call to approve the user
        console.log(`User ${uuid} approved.`);
    };
    const handleReject = (uuid: string) => {
        // Dispatch an action or make an API call to reject the user
        console.log(`User ${uuid} rejected.`);
    };
    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{"error"}</Typography>;

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h2" component="h2">
                New User Requests
            </Typography>
            <List>
                {users.map((user) => (
                    <Card key={user.uuid} sx={{ marginBottom: 2, borderRadius: 2, boxShadow: 3 }}>
                        <CardContent>
                            <Accordion
                                expanded={expandedUser === user.uuid}
                                onChange={() => handleExpand(user.uuid)}
                                elevation={0}
                                sx={{ backgroundColor: "transparent", boxShadow: "none" }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls={`panel-${user.uuid}-content`}
                                >
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            p: 2,
                                            width: "100%",
                                            borderRadius: 2,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 1,
                                        }}
                                    >
                                        <Typography variant="h6">{`${user.firstName} ${user.lastName}`}</Typography>
                                    </Paper>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Paper
                                        elevation={1}
                                        sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}
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
                                                <Typography variant="subtitle2">Roles</Typography>
                                                <Typography>{user.roles.join(", ") || "None"}</Typography>
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2">Email</Typography>
                                            <Typography>{user.email}</Typography>
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
                                                textAlign: "right",
                                                display: "flex",
                                                gap: 2,
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleApprove(user.uuid)}
                                            >
                                                Approve User
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleReject(user.uuid)}
                                            >
                                                Reject User
                                            </Button>
                                        </Box>
                                    </Paper>
                                </AccordionDetails>
                            </Accordion>
                        </CardContent>
                    </Card>
                ))}
            </List>
            <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={handlePageChange}
                sx={{ mt: 2, display: "flex", justifyContent: "center" }}
            />
        </Box>
    );
};

export default NewUserRequestsPage;
