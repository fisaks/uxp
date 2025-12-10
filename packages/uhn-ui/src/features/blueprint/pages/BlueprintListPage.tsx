import HistoryIcon from "@mui/icons-material/History";
import { Box, IconButton, Paper, Typography, useTheme } from "@mui/material";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAppDispatch } from "../../../app/store";

import { useFetchBlueprintsQuery } from "../blueprint.api";
import { openActivationListDialog } from "../blueprintSlice";
import BlueprintActivationListDialog from "../components/BlueprintActivationListDialog";
import BlueprintList from "../components/BlueprintList";


export const BlueprintListPage: React.FC = () => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { isLoading, isFetching,error, refetch } = useFetchBlueprintsQuery();

    const showActivationList = useCallback(() => {
        dispatch(openActivationListDialog(undefined));
    }, [dispatch]);

    error

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h1">Blueprints</Typography>
                <ReloadIconButton isLoading={isFetching} reload={refetch} />
                <IconButton onClick={showActivationList} title="View Activation History"
                    sx={{ color: theme.palette.primary.main }}                    >
                    <HistoryIcon />
                </IconButton>
            </Box>
            <Box p={2}>
                <Paper elevation={3} sx={{
                    mt: 2,
                    p: 3,
                    maxWidth: 1200,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}>
                    <BlueprintList isLoading={isLoading}
                        error={error ? "An error occurred while fetching blueprints" : undefined} />
                </Paper>
                <BlueprintActivationListDialog />

            </Box>
        </Box>
    );
}