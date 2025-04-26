import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PrintIcon from '@mui/icons-material/Print';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { CircularProgress, IconButton, useTheme } from "@mui/material";
import { ActionIconButton, InlineError, mapApiErrorsToMessageString, MenuItemType, MultiLevelMenu, usePortalContainerRef, useSafeState, WithOptionalTooltip } from "@uxp/ui-lib";

import { deleteHouse } from "../houseThunks";

import { buildPath } from '@uxp/common';

import { House } from '@h2c/common';
import { getBaseRoutePath } from '../../../config';
import { createHouseVersion } from '../house.api';
import { HouseHistoryDrawer } from './HouseHistoryDrawer';
import HouseVersionLabelDialog from './HouseVersionLabelDialog';

type HouseActionsProps = {
    house: House;
    handleEditToggle: (event: React.MouseEvent<HTMLElement>, houseId: string) => void
}
export const HouseActions = ({ house, handleEditToggle }: HouseActionsProps) => {
    const dispatch: AppDispatch = useDispatch();
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [versionLabelDialogOpen, setVersionLabelDialogOpen] = useState(false);

    const handleVersionSave = () => {
        setVersionLabelDialogOpen(true);
    }
    const handlePrint = async () => {

        try {
            setLoading(true);
            const response = await createHouseVersion({ uuidHouse: house.uuid, label: `${house.name} Version for printing` });
            const previewPath = buildPath(getBaseRoutePath() ?? "/", "house-info/preview", response.uuid, `${response.version}`);
            window.open(`${previewPath}?printView=true`, `house-${response.uuid}-${response.version}`);

        } catch (e) {
            setError(mapApiErrorsToMessageString(e))

        } finally {
            setLoading(false);
        }
    }
    const handleHistory = () => {
        setHistoryDrawerOpen(true)
    }

    const moreItems: MenuItemType[] = useMemo(
        () => [
            {
                icon: <SaveAsIcon />,
                disabled: false,
                label: "Save Version",
                onClick: handleVersionSave,
            },
            {
                icon: <PrintIcon />,
                label: "Print/Export",
                disabled: false,
                onClick: handlePrint,

            },
            {
                icon: <HistoryIcon />,
                label: "View History",
                disabled: false,
                onClick: handleHistory,

            },
        ], [])

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
    }

    return <>
        <ActionIconButton
            thunk={deleteHouse}
            dispatch={dispatch}
            payload={house.uuid}
            confirmMessage="Are you sure you want to delete this house?"
            tooltip="Delete House"
        >
            <DeleteIcon sx={{ color: theme.palette.error.main }} />
        </ActionIconButton>
        <WithOptionalTooltip tooltip={"Edit House"}>
            <IconButton onClick={(e) => handleEditToggle(e, house.uuid)} aria-label="Edit House">
                <EditIcon sx={{ color: theme.palette.primary.main }} />
            </IconButton>
        </WithOptionalTooltip>
        <MultiLevelMenu
            menuItems={moreItems}
            triggerIcon={<MoreVertIcon />}
            tooltipText="More"
            container={portalContainer.current}
            onClick={handleMenuClick}
        />
        {loading && <CircularProgress size={15} />}
        {error && <InlineError message={error} small portalContainer={portalContainer} />}

        <HouseVersionLabelDialog open={versionLabelDialogOpen} onClose={() => setVersionLabelDialogOpen(false)} house={house} />
        <HouseHistoryDrawer open={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} house={house} />

    </>
}