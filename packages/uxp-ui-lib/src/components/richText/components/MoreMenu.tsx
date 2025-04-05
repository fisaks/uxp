import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PrintIcon from '@mui/icons-material/Print';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import { Box, CircularProgress } from "@mui/material";
import { useMemo } from "react";
import { useSafeState } from '../../../hooks/useSafeState';
import { mapApiErrorsToMessageString } from '../../../util/browserErrorMessage';
import InlineError from '../../layout/InLineError';
import InlineSuccess from '../../layout/InlineSuccess';
import MultiLevelMenu from "../../layout/MultiLevelMenu";
import { MenuItemType } from "../../layout/RecursiveMenuItem";
import { useRichEditorUI } from "../RichEditorContext";
import { formatUtcIsoToLocal } from '@uxp/common';

export const MoreMenu = () => {
    const { editor, portalContainerRef, editable, onSaveVersion } = useRichEditorUI();
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const [success, setSuccess] = useSafeState<{ message: string, newVersion: boolean } | undefined>(undefined);

    const handleVersionSave = async () => {
        if (!onSaveVersion) return;
        setError(undefined);
        setSuccess(undefined);
        setLoading(true);

        try {
            const response = await onSaveVersion();
            setSuccess(response.newVersion ? {
                message: `Version saved successfully ${formatUtcIsoToLocal(response.createdAt)}`,
                newVersion: true
            } : {
                message: `Version already exists ${formatUtcIsoToLocal(response.createdAt)}`,
                newVersion: false
            });
            console.log("Version saved successfully", response);
        } catch (error) {
            console.error("Type of error:", typeof error);
            console.error("Error saving version:", error, "Type of error:", typeof error);
            setError(mapApiErrorsToMessageString(error));
        } finally {
            setLoading(false);
        }
    }
    const moreItems: MenuItemType[] = useMemo(
        () => [
            {
                icon: <SaveAsIcon />,
                disabled: !editable || !onSaveVersion,
                label: "Save Version",
                onClick: handleVersionSave,
            },
            {
                icon: <PrintIcon />,
                label: "Print/Export",
                disabled: true,
                onClick: () => { }
            },
            {
                icon: <HistoryIcon />,
                label: "View History",
                disabled: true,
                onClick: () => { }
            },
        ], [editor, editable])

    return (
        <Box sx={{ display: "flex", alignItems: "center" }}>
            {loading && <CircularProgress size={15} />}
            {error && <InlineError message={error} small portalContainer={portalContainerRef} />}
            {success && <InlineSuccess message={success.message} small
                portalContainer={portalContainerRef} duration={5000}
                icon={success.newVersion ? PublishedWithChangesIcon : undefined} />}
            <MultiLevelMenu
                menuItems={moreItems}
                triggerIcon={<MoreVertIcon />}
                tooltipText="More"
                container={portalContainerRef.current}
            />
        </Box>
    );
}