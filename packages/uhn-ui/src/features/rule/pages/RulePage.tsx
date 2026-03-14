import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DeselectIcon from "@mui/icons-material/Deselect";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, Badge, Box, IconButton, InputAdornment, Paper, TextField, Typography } from "@mui/material";
import { RuntimeResource, RuntimeRuleInfo, isLogicalResource, isPhysicalResource } from "@uhn/common";
import { ReloadIconButton, TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectAllResources, selectResourceById } from "../../resource/resourceSelector";
import { selectRuntimeStatusById } from "../../runtime-overview/runtimeOverviewSelectors";
import { TechnicalSearchField } from "../../technical/components/TechnicalSearchField";
import { useDeepLinkHighlight } from "../../technical/hooks/useDeepLinkHighlight";
import { useSearchHistory } from "../../technical/hooks/useSearchHistory";
import { SearchIndexEntry, useTechnicalSearch } from "../../technical/hooks/useTechnicalSearch";
import { MobileResourceDialog } from "../components/MobileResourceDialog";
import { RuleDetailPanel } from "../components/RuleDetailPanel";
import { RuleGroupGrid } from "../components/RuleGroupGrid";
import { useRulePageState } from "../hooks/useRulePageState";
import { selectAllRules } from "../ruleSelectors";

type RuleGroup = { target: string; rules: RuntimeRuleInfo[] };

/** Builds a lowercase search string for a rule. Kept in the page (not the slice)
 *  because it joins data from two slices (rules + resources) and is cheap derived data. */
const buildSearchText = (rule: RuntimeRuleInfo, resourceById: Record<string, RuntimeResource>): string => {
    const triggerResources = rule.triggers.map(t => resourceById[t.resourceId]).filter(Boolean);
    const triggerKinds = rule.triggers.map(t => t.kind);
    const triggerEvents = rule.triggers
        .map(t => ("event" in t ? (t as { event?: string }).event : undefined))
        .filter(Boolean);
    return [
        rule.id, rule.name, rule.description,
        rule.executionTarget ?? "master",
        ...rule.triggers.map(t => t.resourceId),
        ...triggerResources.flatMap(r => [r.name, isPhysicalResource(r) ? r.edge : isLogicalResource(r) ? r.host : undefined]),
        ...triggerKinds,
        ...triggerEvents,
    ].filter(Boolean).join(" ").toLowerCase();
};

/** Groups rules by execution target. Master group comes first, then edges sorted alphabetically. */
function groupFilteredRules(filteredRules: RuntimeRuleInfo[]): RuleGroup[] {
    const grouped = new Map<string, RuntimeRuleInfo[]>();
    for (const rule of filteredRules) {
        const target = rule.executionTarget ?? "master";
        let list = grouped.get(target);
        if (!list) {
            list = [];
            grouped.set(target, list);
        }
        list.push(rule);
    }

    const groups: RuleGroup[] = [];
    const masterRules = grouped.get("master");
    if (masterRules) {
        groups.push({ target: "master", rules: masterRules });
        grouped.delete("master");
    }
    for (const [target, rules] of Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        groups.push({ target, rules });
    }
    return groups;
}

export const RulePage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const [loading, setLoading] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const portalContainer = usePortalContainerRef();
    const allRules = useSelector(selectAllRules);
    const allResources = useSelector(selectAllResources);
    const resourceById = useSelector(selectResourceById);
    const statusById = useSelector(selectRuntimeStatusById);

    const { highlightedTileId, highlightedTileRef, scrollToHighlightedTile } = useDeepLinkHighlight();

    const {
        selectedRuleIds,
        orderedResourceIds,
        handleSelectRule,
        handleManualAddResource,
        handleRemoveResource,
        handleRemoveAllResources,
        handleReorderResources,
        locationState,
        updatePageState,
    } = useRulePageState({ allRules, resourceById, highlightedTileId });

    // Auto-select deep-linked tile (replace, not push, so back navigates away)
    useEffect(() => {
        if (highlightedTileId && selectedRuleIds.size === 0) {
            updatePageState({ selectedRuleIds: [highlightedTileId] }, false);
        }
    }, [highlightedTileId, selectedRuleIds.size, updatePageState]);

    const deepLinkLabel = highlightedTileId
        ? allRules.find(r => r.id === highlightedTileId)?.name ?? highlightedTileId
        : undefined;

    const searchIndex: SearchIndexEntry<RuntimeRuleInfo>[] = useMemo(
        () => allRules.map((rule) => ({ item: rule, text: buildSearchText(rule, resourceById) })),
        [allRules, resourceById]
    );

    const { searchTerm, onSearchChange, filteredItems, totalCount } = useTechnicalSearch({
        searchIndex,
        locationState,
    });

    const { commit: commitSearchTerm } = useSearchHistory("uhn-rule-search-history");

    const groups = useMemo(() => groupFilteredRules(filteredItems), [filteredItems]);

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["rule/*", "resource/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["rule/*", "resource/*"] });
        } finally {
            setLoading(false);
        }
    };

    const resourceAutocomplete = (
        <Autocomplete
            size="small"
            options={allResources}
            getOptionLabel={(r) => r.name ?? r.id}
            filterOptions={(options, { inputValue }) => {
                const words = inputValue.toLowerCase().split(/\s+/).filter(Boolean);
                if (words.length === 0) return options;
                return options.filter(r => {
                    const text = `${r.id} ${r.name ?? ""}`.toLowerCase();
                    return words.every(w => text.includes(w));
                });
            }}
            onChange={handleManualAddResource}
            value={null}
            blurOnSelect
            slotProps={{ popper: { container: portalContainer.current } }}
            sx={{
                width: "100%",
                "& .MuiAutocomplete-popupIndicator": { color: "text.secondary" },
                "& .MuiAutocomplete-clearIndicator": { color: "text.secondary" },
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Add resource..."
                    slotProps={{
                        input: {
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            )}
        />
    );

    // Only visible on mobile — opens the resource detail panel as a dialog (hidden on md+ where the panel is inline).
    const mobileResourceButton = (
        <IconButton
            onClick={() => setMobileDrawerOpen(true)}
            sx={{ display: { xs: "flex", md: "none" }, flexShrink: 0 }}
        >
            <Badge
                badgeContent={orderedResourceIds.length}
                color="primary"
                invisible={orderedResourceIds.length === 0}
            >
                <ListAltIcon sx={{ color: "text.secondary" }} />
            </Badge>
        </IconButton>
    );

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountTreeIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Rules</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
                <TooltipIconButton
                    onClick={() => updatePageState({ selectedRuleIds: [], removedResourceIds: [] }, false)}
                    tooltip={selectedRuleIds.size > 0 ? "Clear rule selection" : "No rules selected"}
                    tooltipPortal={portalContainer}
                    disabled={selectedRuleIds.size === 0}
                    sx={{ color: "primary.main" }}
                >
                    <DeselectIcon />
                </TooltipIconButton>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
                {/* Left: search + rule tile grid */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TechnicalSearchField
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder="Filter rules..."
                        filteredCount={filteredItems.length}
                        totalCount={totalCount}
                        deepLinkLabel={deepLinkLabel}
                        onScrollToHighlightedTile={scrollToHighlightedTile}
                        historyKey="uhn-rule-search-history"
                        rightContent={mobileResourceButton}
                    />
                    <RuleGroupGrid
                        groups={groups}
                        statusById={statusById}
                        selectedRuleIds={selectedRuleIds}
                        highlightedTileId={highlightedTileId}
                        highlightedTileRef={highlightedTileRef}
                        onSelect={handleSelectRule}
                        onSearchChange={onSearchChange}
                        commitSearchTerm={commitSearchTerm}
                        searchTerm={searchTerm}
                    />
                </Box>

                {/* Right: resource search + detail panel (desktop only) */}
                <Box sx={{
                    display: { xs: "none", md: "block" },
                    width: 400,
                    flexShrink: 0,
                    position: "sticky",
                    top: 16,
                    alignSelf: "flex-start",
                    maxHeight: "calc(100vh - 32px)",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}>
                    <Box sx={{ mt: 2, mb: 2 }}>
                        {resourceAutocomplete}
                    </Box>
                    <Paper variant="outlined" sx={{ borderRadius: 3, mt: 5.6 }}>
                        <RuleDetailPanel
                            resourceIds={orderedResourceIds}
                            hasSelection={selectedRuleIds.size > 0}
                            onRemoveResource={handleRemoveResource}
                            onRemoveAll={handleRemoveAllResources}
                            onReorder={handleReorderResources}
                            resourceById={resourceById}
                        />
                    </Paper>
                </Box>
            </Box>

            <MobileResourceDialog
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
                container={portalContainer.current}
                resourceAutocomplete={resourceAutocomplete}
                resourceIds={orderedResourceIds}
                hasSelection={selectedRuleIds.size > 0}
                onRemoveResource={handleRemoveResource}
                onRemoveAll={handleRemoveAllResources}
                onReorder={handleReorderResources}
                resourceById={resourceById}
            />
        </Box>
    );
};
