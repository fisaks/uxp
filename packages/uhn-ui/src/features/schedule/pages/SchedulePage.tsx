import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { Box, Button, Card, CardContent, Grid2, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePortalContainerRef, ReloadIconButton } from "@uxp/ui-lib";
import { RuntimeInteractionView, RuntimeResource, RuntimeScene, RuntimeSchedule, ScheduleMuteInfo, StoredScheduleAction, UserScheduleInfo } from "@uhn/common";
import { ScheduleWhen } from "@uhn/blueprint";
import React, { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ScheduleCreatorDialog, EditScheduleData } from "../components/ScheduleCreatorDialog";
import { ScheduleDetailPopover, ScheduleDetailData, SlotActionInfo } from "../components/ScheduleDetailPopover";
import { selectBlueprintSchedules, selectMuteByScheduleId, selectUserSchedules } from "../scheduleSelectors";
import { describeWhen } from "../schedule.util";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectAllViews } from "../../view/viewSelectors";
import { selectAllResources } from "../../resource/resourceSelector";
import { selectAllScenes } from "../../scene/sceneSelectors";
import { TechnicalSearchField } from "../../technical/components/TechnicalSearchField";
import { useDeepLinkHighlight } from "../../technical/hooks/useDeepLinkHighlight";
import { SearchIndexEntry, useTechnicalSearch } from "../../technical/hooks/useTechnicalSearch";
import { formatDateTime } from "../../shared/dateTimeFormat";

type TargetEntry =
    | { kind: "view"; id: string; label: string; item: RuntimeInteractionView }
    | { kind: "resource"; id: string; label: string; item: RuntimeResource }
    | { kind: "scene"; id: string; label: string; item: RuntimeScene };

function describeAction(a: StoredScheduleAction): SlotActionInfo {
    switch (a.type) {
        case "setDigitalOutput": return { label: `${a.resourceId} → ${a.value ? "on" : "off"}`, link: `/technical/resources/${a.resourceId}` };
        case "setAnalogOutput": return { label: `${a.resourceId} → ${a.value}`, link: `/technical/resources/${a.resourceId}` };
        case "emitSignal": return { label: `${a.resourceId} → ${a.value ? "on" : "off"}`, link: `/technical/resources/${a.resourceId}` };
        case "tap": return { label: `${a.resourceId} → press`, link: `/technical/resources/${a.resourceId}` };
        case "longPress": return { label: `${a.resourceId} → long press (${a.holdMs}ms)`, link: `/technical/resources/${a.resourceId}` };
        case "setActionOutput": return { label: `${a.resourceId} → ${a.action}`, link: `/technical/resources/${a.resourceId}` };
        case "activateScene": return { label: `Scene: ${a.sceneId}`, link: `/technical/scenes/${a.sceneId}` };
    }
}

/* ------------------------------------------------------------------ */
/* Unified schedule item for search/display                            */
/* ------------------------------------------------------------------ */

type SchedulePhaseDisplay = {
    name: string;
    when: ScheduleWhen;
    firedAt?: string;
};

type ScheduleItem = {
    id: string;
    name: string;
    description?: string;
    phases: SchedulePhaseDisplay[];
    missedGraceMs: number;
    source: "blueprint" | "user";
    dbId?: number;
    mute?: ScheduleMuteInfo;
};

function buildSearchText(item: ScheduleItem): string {
    return [
        item.id, item.name, item.description, item.source,
        ...item.phases.map(p => `${p.name} ${describeWhen(p.when)}`),
    ].filter(Boolean).join(" ").toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Phase chip                                                          */
/* ------------------------------------------------------------------ */

const PhaseChip: React.FC<{ name: string; when: ScheduleWhen; firedAt?: string }> = ({ name, when, firedAt }) => {
    const theme = useTheme();
    const isFired = !!firedAt;
    return (
    <Box sx={{
        flex: "1 1 0",
        minWidth: 0,
        border: 1,
        borderColor: theme.palette.divider,
        borderRadius: 1,
        boxShadow: 1,
        px: 1,
        py: 0.5,
        opacity: isFired ? 0.5 : 1,
    }}>
        <Typography variant="caption" sx={{
            display: "block",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        }}>
            {name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        }}>
            {isFired ? `✓ Fired ${formatDateTime(firedAt!)}` : describeWhen(when)}
        </Typography>
    </Box>
    );
};

/* ------------------------------------------------------------------ */
/* Schedule card                                                       */
/* ------------------------------------------------------------------ */

const MAX_VISIBLE_PHASES = 2;

const ScheduleCard: React.FC<{
    item: ScheduleItem;
    onCardClick: (item: ScheduleItem, anchor: HTMLElement) => void;
}> = ({ item, onCardClick }) => {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const muteById = useSelector(selectMuteByScheduleId);
    const mute = muteById[item.id];
    const isMuted = !!mute;
    const isOneTime = item.phases.every(p => p.when.kind === "date");
    const allFired = isOneTime && item.phases.length > 0 && item.phases.every(p => !!p.firedAt);

    const visiblePhases = item.phases.slice(0, MAX_VISIBLE_PHASES);
    const extraCount = item.phases.length - MAX_VISIBLE_PHASES;

    const muteTooltip = mute?.mutedUntil
        ? `Muted until ${formatDateTime(mute.mutedUntil)}`
        : "Muted indefinitely";

    const sourceTooltip = item.source === "blueprint" ? "Blueprint schedule" : "User schedule";

    return (
        <Card
            ref={cardRef}
            variant="outlined"
            onClick={() => cardRef.current && onCardClick(item, cardRef.current)}
            sx={{
                borderRadius: 3,
                height: { xs: "auto", sm: 140 },
                display: "flex",
                flexDirection: "column",
                opacity: allFired ? 0.5 : isMuted ? 0.7 : 1,
                transition: "opacity 0.2s",
                cursor: "pointer",
                "&:hover": { boxShadow: 2 },
            }}>
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, "&:last-child": { pb: 1.5 } }}>
                {/* Top row: icon + name + source icon */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                    <Tooltip title={item.description ?? ""} slotProps={{ popper: { container: portalContainer.current } }}>
                        <CalendarMonthIcon sx={{ fontSize: 18, color: "primary.main", flexShrink: 0 }} />
                    </Tooltip>
                    <Typography variant="subtitle2" sx={{
                        flex: 1,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}>
                        {item.name}
                    </Typography>
                    <Tooltip title={sourceTooltip} slotProps={{ popper: { container: portalContainer.current } }}>
                        {item.source === "blueprint"
                            ? <DescriptionIcon sx={{ fontSize: 14, color: theme.palette.text.secondary, flexShrink: 0 }} />
                            : <PersonIcon sx={{ fontSize: 14, color: theme.palette.text.secondary, flexShrink: 0 }} />
                        }
                    </Tooltip>
                </Box>

                {/* Middle: phase chips */}
                <Box sx={{ display: "flex", gap: 0.5, flex: 1, alignItems: "flex-start", position: "relative" }}>
                    {visiblePhases.map((phase, i) => (
                        <PhaseChip key={i} name={phase.name} when={phase.when} firedAt={phase.firedAt} />
                    ))}
                    {extraCount > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{
                            position: "absolute",
                            right: -2,
                            top: 0,
                            fontSize: "0.65rem",
                        }}>
                            +{extraCount}
                        </Typography>
                    )}
                </Box>

                {/* Bottom row: mute info or completed */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    {allFired ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                            ✓ Completed
                        </Typography>
                    ) : isMuted ? (
                        <>
                            <Tooltip title={muteTooltip} slotProps={{ popper: { container: portalContainer.current } }}>
                                <VolumeOffIcon sx={{ fontSize: 14, color: "warning.main" }} />
                            </Tooltip>
                            <Typography variant="caption" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                By {mute!.mutedBy}{mute!.mutedUntil ? ` until ${formatDateTime(mute!.mutedUntil)}` : " · Indefinitely"}
                            </Typography>
                        </>
                    ) : null}
                </Box>
            </CardContent>
        </Card>
    );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const SchedulePage: React.FC = () => {
    const blueprintSchedules = useSelector(selectBlueprintSchedules);
    const userSchedules = useSelector(selectUserSchedules);
    const muteById = useSelector(selectMuteByScheduleId);
    const allViews = useSelector(selectAllViews);
    const allResources = useSelector(selectAllResources);
    const allScenes = useSelector(selectAllScenes);
    const { sendMessageAsync } = useUHNWebSocket();
    const { highlightedTileId, highlightedTileRef, scrollToHighlightedTile } = useDeepLinkHighlight();

    // Build resource lookup for resolving stored actions back to targets
    const targetByResourceId = useMemo(() => {
        const map: Record<string, TargetEntry> = {};
        for (const v of allViews) if (v.command) map[v.command.resourceId] = { kind: "view" as const, id: v.id, label: v.name ?? v.id, item: v };
        for (const r of allResources) map[r.id] = { kind: "resource" as const, id: r.id, label: r.name ?? r.id, item: r };
        for (const s of allScenes) map[s.id] = { kind: "scene" as const, id: s.id, label: s.name ?? s.id, item: s };
        return map;
    }, [allViews, allResources, allScenes]);
    const [loading, setLoading] = useState(false);
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [editData, setEditData] = useState<EditScheduleData | undefined>(undefined);
    const [detailAnchorPos, setDetailAnchorPos] = useState<{ top: number; left: number } | null>(null);
    const [detailData, setDetailData] = useState<ScheduleDetailData | null>(null);

    const handleCardClick = useCallback((item: ScheduleItem, anchor: HTMLElement) => {
        const data: ScheduleDetailData = {
            id: item.id,
            name: item.name,
            description: item.description,
            source: item.source,
            phases: item.phases,
            missedGraceMs: item.missedGraceMs,
            mute: item.mute,
            dbId: item.dbId,
        };
        if (item.source === "user") {
            const userSchedule = userSchedules.find(s => s.scheduleId === item.id);
            if (userSchedule) {
                data.slots = userSchedule.slots.map((slot, i) => ({
                    name: slot.name,
                    when: slot.when,
                    actions: slot.actions.map(a => describeAction(a)),
                }));
                data.createdBy = userSchedule.createdBy;
                data.createdAt = userSchedule.createdAt;
            }
        }
        const rect = anchor.getBoundingClientRect();
        setDetailAnchorPos({ top: rect.bottom, left: rect.left + rect.width / 2 });
        setDetailData(data);
    }, [userSchedules]);

    const allItems = useMemo((): ScheduleItem[] => {
        const items: ScheduleItem[] = [];
        for (const s of blueprintSchedules) {
            items.push({
                id: s.id, name: s.name, description: s.description,
                phases: s.phases.map(p => ({ name: p.name, when: p.when })),
                missedGraceMs: s.missedGraceMs,
                source: "blueprint", mute: muteById[s.id],
            });
        }
        for (const s of userSchedules) {
            items.push({
                id: s.scheduleId, name: s.name,
                phases: s.slots.map(slot => ({ name: slot.name, when: slot.when, firedAt: slot.firedAt })),
                missedGraceMs: s.missedGraceMs,
                source: "user", dbId: s.id, mute: muteById[s.scheduleId],
            });
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        return items;
    }, [blueprintSchedules, userSchedules, muteById]);

    const searchIndex: SearchIndexEntry<ScheduleItem>[] = useMemo(
        () => allItems.map(item => ({ item, text: buildSearchText(item) })),
        [allItems]
    );

    const { searchTerm, onSearchChange, filteredItems, totalCount } = useTechnicalSearch({ searchIndex });

    const deepLinkLabel = highlightedTileId
        ? allItems.find(i => i.id === highlightedTileId)?.name ?? highlightedTileId
        : undefined;

    const handleEdit = useCallback((scheduleId: string) => {
        const us = userSchedules.find(s => s.scheduleId === scheduleId);
        if (!us) return;
        const data: EditScheduleData = {
            dbId: us.id,
            name: us.name,
            missedGraceMs: us.missedGraceMs,
            slots: us.slots.map(slot => ({
                name: slot.name,
                when: slot.when,
                actions: slot.actions.map(a => {
                    if (a.type === "activateScene") {
                        return { target: targetByResourceId[a.sceneId] ?? null, actionType: "activate" as const };
                    }
                    if (a.type === "tap") {
                        return { target: targetByResourceId[a.resourceId] ?? null, actionType: "tap" as const };
                    }
                    if (a.type === "longPress") {
                        return { target: targetByResourceId[a.resourceId] ?? null, actionType: "longPress" as const };
                    }
                    if (a.type === "emitSignal") {
                        return { target: targetByResourceId[a.resourceId] ?? null, actionType: a.value ? "on" as const : "off" as const };
                    }
                    if (a.type === "setActionOutput") {
                        return { target: targetByResourceId[a.resourceId] ?? null, actionType: "on" as const };
                    }
                    // setDigitalOutput | setAnalogOutput — both have resourceId and value
                    const target = targetByResourceId[a.resourceId] ?? null;
                    if (a.type === "setDigitalOutput") {
                        return { target, actionType: a.value ? "on" as const : "off" as const };
                    }
                    // setAnalogOutput
                    const actionType = a.value === 0 ? "off" as const : "setValue" as const;
                    return { target, actionType, value: a.value };
                }),
            })),
        };
        setDetailAnchorPos(null);
        setDetailData(null);
        setEditData(data);
        setCreatorOpen(true);
    }, [userSchedules, targetByResourceId]);

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["schedule/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["schedule/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarMonthIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Schedules</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCreatorOpen(true)}
                    sx={{ ml: "auto" }}
                >
                    New Schedule
                </Button>
            </Box>
            <TechnicalSearchField
                value={searchTerm}
                onChange={onSearchChange}
                placeholder="Filter schedules..."
                filteredCount={filteredItems.length}
                totalCount={totalCount}
                deepLinkLabel={deepLinkLabel}
                onScrollToHighlightedTile={scrollToHighlightedTile}
                historyKey="uhn-schedule-search-history"
            />
            <Box mt={2}>
                {filteredItems.length > 0 ? (
                    <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                        {filteredItems.map(item => (
                            <Grid2 key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                ref={highlightedTileId ? highlightedTileRef(item.id) : undefined}
                                sx={highlightedTileId === item.id ? {
                                    "& > .MuiCard-root": {
                                        boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
                                        transition: "box-shadow 0.3s ease",
                                    },
                                } : undefined}
                            >
                                <ScheduleCard
                                    item={item}
                                    onCardClick={handleCardClick}
                                />
                            </Grid2>
                        ))}
                    </Grid2>
                ) : (
                    <Typography color="text.secondary">
                        {searchTerm ? "No schedules match your search." : "No schedules defined."}
                    </Typography>
                )}
            </Box>

            {detailData && (
                <ScheduleDetailPopover
                    data={detailData}
                    anchorPosition={detailAnchorPos}
                    onClose={() => { setDetailAnchorPos(null); setDetailData(null); }}
                    onEdit={detailData.source === "user" ? () => handleEdit(detailData.id) : undefined}
                />
            )}

            {creatorOpen && (
                <ScheduleCreatorDialog
                    open={creatorOpen}
                    onClose={() => { setCreatorOpen(false); setEditData(undefined); }}
                    editData={editData}
                />
            )}
        </Box>
    );
};
