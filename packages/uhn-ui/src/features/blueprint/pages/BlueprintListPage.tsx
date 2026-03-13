import DescriptionIcon from "@mui/icons-material/Description";
import HistoryIcon from "@mui/icons-material/History";
import { Box, Paper, Typography } from "@mui/material";
import { ReloadIconButton, TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useAppDispatch } from "../../../app/store";

import { useFetchBlueprintsQuery } from "../blueprint.api";
import { openActivationListDialog } from "../blueprintSlice";
import BlueprintActivationListDialog from "../components/BlueprintActivationListDialog";
import BlueprintList from "../components/BlueprintList";
import { BlueprintVersionLogDialog } from "../components/BlueprintVersionLogDialog";


export const BlueprintListPage: React.FC = () => {
    const portalContainer = usePortalContainerRef();
    const dispatch = useAppDispatch();
    const { isLoading, isFetching,error, refetch } = useFetchBlueprintsQuery();

    const showActivationList = useCallback(() => {
        dispatch(openActivationListDialog(undefined));
    }, [dispatch]);

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DescriptionIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Blueprints</Typography>
                <ReloadIconButton isLoading={isFetching} reload={refetch} />
                <TooltipIconButton onClick={showActivationList} tooltip="View Activation History"
                    tooltipPortal={portalContainer}
                    sx={{ color: "primary.main" }}>
                    <HistoryIcon />
                </TooltipIconButton>
            </Box>
            <Box mt={2}>
                <Paper elevation={3} sx={{
                    mt: 2,
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}>
                    <BlueprintList isLoading={isLoading}
                        error={error ? "An error occurred while fetching blueprints" : undefined} />
                </Paper>
                <BlueprintActivationListDialog />
                <BlueprintVersionLogDialog />

            </Box>
        </Box>
    );
}