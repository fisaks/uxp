import AddIcon from "@mui/icons-material/Add";
import KeyIcon from "@mui/icons-material/Key";
import { Box, Button, Paper, Typography } from "@mui/material";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAppDispatch } from "../../../app/store";
import { useFetchApiTokensQuery } from "../apiToken.api";
import { openCreateDialog } from "../apiTokenSlice";
import ApiTokenList from "../components/ApiTokenList";
import { ApiTokenCreatedDialog } from "../components/ApiTokenCreatedDialog";
import { CreateApiTokenDialog } from "../components/CreateApiTokenDialog";

export const ApiTokenPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isLoading, isFetching, error, refetch } = useFetchApiTokensQuery();

    const handleCreate = useCallback(() => {
        dispatch(openCreateDialog());
    }, [dispatch]);

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <KeyIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">API Tokens</Typography>
                <ReloadIconButton isLoading={isFetching} reload={refetch} />
            </Box>
            <Box mt={2}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreate}
                >
                    Create Token
                </Button>
            </Box>
            <Box mt={2}>
                <Paper elevation={3} sx={{
                    mt: 2,
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}>
                    <ApiTokenList
                        isLoading={isLoading}
                        error={error ? "An error occurred while fetching API tokens" : undefined}
                    />
                </Paper>
                <CreateApiTokenDialog />
                <ApiTokenCreatedDialog />
            </Box>
        </Box>
    );
};
