import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PrintIcon from '@mui/icons-material/Print';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import React, { useMemo, useRef } from "react";
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
import HouseVersionLabelDialog, { HouseVersionLabelDialogRef } from './HouseVersionLabelDialog';

type HouseArgument = {
    uuid: string;
    houseName: string;
}

type HouseActionsProps = {
    house: House;
    handleEditToggle: (event: React.MouseEvent<HTMLElement>, houseId: string) => void
}
export const HouseActions = ({ house, handleEditToggle }: HouseActionsProps) => {
    const dispatch: AppDispatch = useDispatch();
    const portalContainer = usePortalContainerRef();
    const houseVersionRef = useRef<HouseVersionLabelDialogRef>(null);
    const theme = useTheme();
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);

    const handleVersionSave = (arg?: HouseArgument) => {
        if (!arg) return;
        houseVersionRef.current?.open(arg);
    }
    const handlePrint = async (arg?: HouseArgument) => {
        if (!arg) return;
        try {
            setLoading(true);
            const response = await createHouseVersion({ uuidHouse: arg.uuid, label: `` });
            const previewPath = buildPath(getBaseRoutePath() ?? "/", "house-info/preview", response.uuid, `${response.version}`);
            window.open(`${previewPath}?printView=true`, `house-${response.uuid}-${response.version}`);

        } catch (e) {
            setError(mapApiErrorsToMessageString(e))

        } finally {
            setLoading(false);
        }
    }
    const handleHistory = (arg?: HouseArgument) => {
    }

    const moreItems: MenuItemType<HouseArgument>[] = useMemo(
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
                disabled: true,
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
            itemData={{ uuid: house.uuid, houseName: house.name }}
            triggerIcon={<MoreVertIcon />}
            tooltipText="More"
            container={portalContainer.current}
            onClick={handleMenuClick}
        />
        {loading && <CircularProgress size={15} />}
        {error && <InlineError message={error} small portalContainer={portalContainer} />}

        <HouseVersionLabelDialog ref={houseVersionRef} />
    </>
}