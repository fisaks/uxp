import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import ArticleIcon from "@mui/icons-material/Article";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    Collapse,
    List,
    ListItem,
    Typography
} from "@mui/material";
import { Blueprint, BlueprintStatus, BlueprintVersion } from "@uhn/common";
import { toUxpTimeFormat } from "@uxp/common";
import { ConfirmDialog, InlineError, LinearFetchLine, Loading, mapApiErrorsToMessageString, MenuItemType, MultiLevelMenu, usePortalContainerRef, withErrorHandler, withLoading, WithOptionalTooltip } from "@uxp/ui-lib";
import React, { useMemo, useState } from "react";
import { useAppDispatch } from "../../../app/store";

import { getBaseUrl } from "../../../config";
import { useActivateBlueprintMutation, useDeactivateBlueprintMutation, useDeleteBlueprintMutation, useFetchBlueprintsQuery } from "../blueprint.api";
import { openActivationListDialog, openBlueprintVersionLogDialog } from "../blueprintSlice";
import { error } from "console";


type BlueprintListProps = {
    maxVersionsToShow?: number; // If not set, shows all versions per group
};

const statusColor = (status: BlueprintStatus) => {
    switch (status) {
        case "failed": return "error";
        case "installed": return "success";
        case "uploaded": return "warning";
        default: return "default";
    }
};

const BlueprintList: React.FC<BlueprintListProps> = ({ maxVersionsToShow, }) => {

    const { data: blueprints, isFetching } = useFetchBlueprintsQuery();
    if (!blueprints || !blueprints.length)
        return (
            <Box p={2}>
                <Typography>No blueprints found.</Typography>
            </Box>
        );

    return (
        <Box>
            <LinearFetchLine isFetching={isFetching} />
            <List sx={{ pt: "4px" }}>
                {blueprints.map((blueprint) => (
                    <BlueprintAccordion
                        key={blueprint.identifier}
                        blueprint={blueprint}
                        maxVersionsToShow={maxVersionsToShow}
                    />
                ))}
            </List>
        </Box>
    );
};

const BlueprintAccordion: React.FC<{ blueprint: Blueprint; maxVersionsToShow?: number; }> =
    ({ blueprint, maxVersionsToShow }) => {
        const [expanded, setExpanded] = useState(false);
        const [showAllVersions, setShowAllVersions] = useState(false);

        const visibleVersions = useMemo(() => {
            if (showAllVersions || !maxVersionsToShow) return blueprint.versions;
            const active = blueprint.versions.find((v) => v.active);
            const others = blueprint.versions.filter((v) => !v.active);
            let shown: BlueprintVersion[] = [];
            if (active) shown.push(active);
            shown.push(...others.slice(0, maxVersionsToShow - (active ? 1 : 0)));
            return shown;
        }, [blueprint.versions, maxVersionsToShow, showAllVersions]);

        const showShowAll = maxVersionsToShow
            ? blueprint.versions.length > maxVersionsToShow
            : false;
        const active = blueprint.versions.find(v => v.active);
        const latest = blueprint.versions[0];
        return (
            <Accordion
                expanded={expanded}
                onChange={() => setExpanded((exp) => !exp)}
                sx={{ mb: 2 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {blueprint.name}
                        </Typography>
                        {blueprint.versions.some((v) => v.active) && (
                            <Chip
                                label="Active"
                                color="success"
                                size="small"
                                icon={<CheckCircleIcon />}
                                sx={{ ml: 2 }}
                            />
                        )}
                    </Box>
                    {/* Latest version number */}
                    <Typography variant="body2" color="text.secondary">
                        {active
                            ? `Active: v${active.version}`
                            : `Latest: v${latest.version}`}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <List disablePadding>
                        {visibleVersions.map((blueprintVersion) => (
                            <BlueprintVersionRow key={blueprintVersion.version} blueprintVersion={blueprintVersion} />
                        ))}
                    </List>
                    {showShowAll && (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
                            <Button size="small" onClick={() => setShowAllVersions(v => !v)}>
                                {showAllVersions ? "Show less" : `Show all ${blueprint.versions.length} versions`}
                            </Button>
                        </Box>
                    )}
                </AccordionDetails>
            </Accordion>
        );
    };

const BlueprintVersionRow: React.FC<{ blueprintVersion: BlueprintVersion }> = ({
    blueprintVersion,
}) => {
    const dispatch = useAppDispatch();
    const portalContainer = usePortalContainerRef();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [showMeta, setShowMeta] = useState(false);
    const [activateBlueprint, { isLoading: isActivating, error: activateError, reset: resetActivate }] = useActivateBlueprintMutation();
    const [deactivateBlueprint, { isLoading: isDeactivating, error: deactivateError, reset: resetDeactivate }] = useDeactivateBlueprintMutation();
    const [deleteBlueprint, { isLoading: isDeleting, error: deleteError, reset: resetDelete }] = useDeleteBlueprintMutation();

    const resetAll = () => {
        resetActivate();
        resetDeactivate();
        resetDelete();
    }
    const isAnyLoading = isActivating || isDeactivating || isDeleting;
    const errors = [activateError, deactivateError, deleteError].filter(Boolean).map(e => mapApiErrorsToMessageString(e));
    const handleActivate = () => {
        resetAll();
        activateBlueprint({ identifier: blueprintVersion.identifier, version: blueprintVersion.version });
    };
    const handleDeactivate = () => {
        resetAll();
        deactivateBlueprint({ identifier: blueprintVersion.identifier, version: blueprintVersion.version });
    };
    const handleDelete = () => {
        resetAll();
        setDeleteConfirmOpen(true);
    };
    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false);
    }
    const handleDeleteConfirmClose = () => {
        setDeleteConfirmOpen(false);
        deleteBlueprint({ identifier: blueprintVersion.identifier, version: blueprintVersion.version });
    }
    const handleDownload = () => {
        window.open(`${getBaseUrl()}${blueprintVersion.downloadUrl}`, "_blank");
    };
    const handleShowHistory = () => {
        dispatch(openActivationListDialog({ identifier: blueprintVersion.identifier, version: blueprintVersion.version }));
    };
    const handleBlueprintLog = () => {
        dispatch(openBlueprintVersionLogDialog({ identifier: blueprintVersion.identifier, version: blueprintVersion.version }));
    }

    const actionItems: MenuItemType[] = [
        {
            icon: blueprintVersion.active ? <PauseIcon /> : <PlayArrowIcon />,

            label: blueprintVersion.active ? "Deactivate" : "Activate",
            onClick: blueprintVersion.active ? handleDeactivate : handleActivate,
        },
        {
            icon: <DownloadIcon />,
            disabled: false,
            label: "Download",
            onClick: handleDownload,
        },
        {
            icon: <HistoryIcon />,
            disabled: false,
            label: "Show activation history",
            onClick: () => handleShowHistory(),
        },
        {
            icon: <ArticleIcon />, // or another icon, e.g. <ListAltIcon />
            label: "Show log",
            onClick: () => handleBlueprintLog(),
        },
        {
            icon: <DeleteIcon />,
            disabled: blueprintVersion.active,
            label: "Delete",
            onClick: handleDelete,
        },
    ];
    const { active, version, status, uploadedAt, uploadedBy, activatedAt, activatedBy, deactivatedAt,
        deactivatedBy, metadata, errorSummary } = blueprintVersion
    const errorTooltip = errorSummary ? errorSummary.length > 200 ? errorSummary.slice(0, 200) + "..." : errorSummary : undefined

    return (
        <>
            <ListItem
                sx={{
                    pl: 2,
                    pr: 2,
                    bgcolor: blueprintVersion.active ? "success.light" : undefined,
                    borderLeft: blueprintVersion.active ? "4px solid" : undefined,
                    borderColor: blueprintVersion.active ? "success.main" : undefined,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                }}
                secondaryAction={
                    <MultiLevelMenu
                        triggerIcon={<MoreVertIcon />}
                        tooltipText="Actions"
                        container={portalContainer.current}
                        menuItems={actionItems}
                    />
                }
            >

                <Box sx={{ width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {isAnyLoading && <Loading size={15} />}
                        {errors.length > 0 && <InlineError message={errors.join("\n")} small portalContainer={portalContainer} />}
                        <Typography fontWeight={active ? 600 : undefined}>
                            v{version}
                        </Typography>
                        {active && <Chip label="Active" color="success" size="small" sx={{ ml: 1 }} />}
                        <WithOptionalTooltip tooltip={errorTooltip}
                            portalContainer={portalContainer} error={!!errorTooltip}>
                            <Chip
                                label={status}
                                color={statusColor(status)}
                                size="small"
                                sx={{ ml: 2 }}
                            />
                        </WithOptionalTooltip>

                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Uploaded {toUxpTimeFormat(uploadedAt)}
                        {uploadedBy && <> by <b>{uploadedBy}</b></>}
                    </Typography>
                    {active && (
                        <Typography variant="body2" color="success.main">
                            Active since {toUxpTimeFormat(activatedAt)}
                            {activatedBy && <> by <b>{activatedBy}</b></>}
                        </Typography>
                    )}
                    {!active && deactivatedAt && (
                        <Typography variant="body2" color="text.secondary">
                            Deactivated {toUxpTimeFormat(deactivatedAt)}
                            {deactivatedBy && <> by <b>{deactivatedBy}</b></>}
                        </Typography>
                    )}


                    {/* More/Less */}
                    <Box>
                        <Button
                            size="small"
                            endIcon={showMeta ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            onClick={() => setShowMeta(v => !v)}
                            sx={{ textTransform: "none", minHeight: 0, pl: 0 }}
                            color="primary"
                        >
                            {showMeta ? "Hide details" : "Show details"}
                        </Button>
                        <Collapse in={showMeta}>
                            <Box sx={{ pt: 1 }}>
                                {/* Show only if available */}
                                {metadata && <MetadataFields metadata={metadata} />}
                                {errorSummary && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography fontWeight={500}>Error summary:</Typography>
                                        <pre style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                                            {errorSummary}
                                        </pre>
                                    </Box>
                                )}

                            </Box>
                        </Collapse>
                    </Box>
                </Box>

            </ListItem>
            <ConfirmDialog open={deleteConfirmOpen} onCancel={handleDeleteCancel}
                onConfirm={handleDeleteConfirmClose} title="Confirm Delete Blueprint"
                confirmText={{
                    template: "Are you sure you want to delete {name:bold} {version:bold}? This action cannot be undone.",
                    values: { name: blueprintVersion.name, version: `v${blueprintVersion.version}` }
                }} />
        </>
    );
};

const METADATA_LABELS: Record<string, string> = {
    identifier: "ID",
    name: "Name",
    description: "Description",
    schemaVersion: "Schema Version",
};

const MetadataFields: React.FC<{ metadata?: BlueprintVersion["metadata"] }> = ({ metadata }) => {
    if (!metadata) return <Typography color="text.secondary">No metadata</Typography>;
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {Object.entries(metadata).map(([key, value]) => (
                <Box key={key} sx={{ display: "flex", gap: 1 }}>
                    <Typography sx={{ fontWeight: 500, minWidth: 120 }}>{METADATA_LABELS[key] ?? key}</Typography>
                    <Typography color="text.secondary">{String(value)}</Typography>
                </Box>
            ))}
        </Box>
    );
};


export default withErrorHandler(withLoading(BlueprintList));