import { Box, Grid2, Link as MuiLink, Typography } from "@mui/material";
import { RuntimeRuleInfo, RuntimeStatus } from "@uhn/common";
import React from "react";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { RuleTile } from "./RuleTile";

type RuleGroup = { target: string; rules: RuntimeRuleInfo[] };

function runtimeStatusColor(status: RuntimeStatus | undefined): string {
    switch (status) {
        case "running": return "success.main";
        case "starting":
        case "restarting": return "warning.main";
        case "failed": return "error.main";
        default: return "text.disabled";
    }
}

type RuleGroupGridProps = {
    groups: RuleGroup[];
    statusById: Record<string, RuntimeStatus>;
    selectedRuleIds: Set<string>;
    highlightedTileId: string | undefined;
    highlightedTileRef: (id: string) => ((el: HTMLElement | null) => void) | undefined;
    onSelect: (ruleId: string) => void;
    onSearchChange: (value: string) => void;
    commitSearchTerm: (value: string) => void;
    searchTerm: string;
};

export const RuleGroupGrid: React.FC<RuleGroupGridProps> = ({
    groups,
    statusById,
    selectedRuleIds,
    highlightedTileId,
    highlightedTileRef,
    onSelect,
    onSearchChange,
    commitSearchTerm,
    searchTerm,
}) => {
    if (groups.length === 0) {
        return (
            <Typography color="text.secondary">
                {searchTerm ? "No rules match your search." : "No rules available."}
            </Typography>
        );
    }

    return (
        <>
            {groups.map(group => (
                <Box key={group.target} sx={{ mb: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Box sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: runtimeStatusColor(statusById[group.target]),
                            flexShrink: 0,
                        }} />
                        <MuiLink
                            component="button"
                            variant="subtitle2"
                            color="text.secondary"
                            underline="hover"
                            onClick={() => { onSearchChange(group.target); commitSearchTerm(group.target); }}
                            sx={{ textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer" }}
                        >
                            {group.target}
                        </MuiLink>
                    </Box>
                    <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                        {group.rules.map(rule => (
                            <Grid2 key={rule.id} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }}
                                ref={highlightedTileId ? highlightedTileRef(rule.id) : undefined}
                                sx={{
                                    ...wideGridItemSx,
                                    ...(highlightedTileId === rule.id && {
                                        "& > .MuiCard-root": {
                                            boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
                                            transition: "box-shadow 0.3s ease",
                                        },
                                    }),
                                }}>
                                <RuleTile
                                    rule={rule}
                                    selected={selectedRuleIds.has(rule.id)}
                                    onSelect={onSelect}
                                />
                            </Grid2>
                        ))}
                    </Grid2>
                </Box>
            ))}
        </>
    );
};
