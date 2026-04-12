import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { Box, Card, CardActionArea, Chip, Typography } from "@mui/material";
import { RuntimeRuleInfo, RuntimeStatus } from "@uhn/common";
import React from "react";
import { useSelector } from "react-redux";
import { selectRuntimeStatusById } from "../../runtime-overview/runtimeOverviewSelectors";
import { TechnicalDeepLink } from "../../shared/TechnicalDeepLink";
import { TileDescriptionPopover } from "../../shared/TileDescriptionPopover";
import { TileInfoPopover } from "../../shared/TileInfoPopover";
import { triggerEventLabel } from "../../shared/triggerEventLabel";

type RuleTileProps = {
    rule: RuntimeRuleInfo;
    selected?: boolean;
    onSelect?: (ruleId: string) => void;
};

function runtimeStatusChipColor(status: RuntimeStatus | undefined): "success" | "warning" | "error" | "default" {
    switch (status) {
        case "running": return "success";
        case "starting":
        case "restarting": return "warning";
        case "failed": return "error";
        default: return "default";
    }
}

export const RuleTile: React.FC<RuleTileProps> = ({ rule, selected, onSelect }) => {
    const displayName = rule.name ?? rule.id;
    const target = rule.executionTarget ?? "master";
    const statusById = useSelector(selectRuntimeStatusById);
    const runtimeStatus = statusById[target];

    return (
        <Card
            variant="outlined"
            sx={{
                position: "relative",
                borderRadius: 3,
                boxShadow: selected ? 4 : 2,
                height: { xs: "auto", sm: 154 },
                display: "flex",
                flexDirection: "column",
                transition: "background-color 0.3s, box-shadow 0.2s",
                "&:hover": { boxShadow: 4 },
                ...(selected && {
                    borderColor: "primary.main",
                    borderWidth: 2,
                }),
            }}
        >
            <TileInfoPopover>
                <Typography variant="subtitle2">Rule Details</Typography>
                <Typography variant="body2">ID: {rule.id}</Typography>
                <Typography variant="body2">Target: {target}</Typography>
                {rule.priority !== undefined && (
                    <Typography variant="body2">Priority: {rule.priority}</Typography>
                )}
                {rule.suppressMs !== undefined && (
                    <Typography variant="body2">Suppress: {rule.suppressMs}ms</Typography>
                )}
                {rule.cooldownMs !== undefined && (
                    <Typography variant="body2">Cooldown: {rule.cooldownMs}ms</Typography>
                )}
                {rule.triggers.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Triggers ({rule.triggers.length})</Typography>
                        {rule.triggers.map((trigger, i) => (
                            <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                {trigger.kind === "schedule" ? (
                                    <>schedule:{trigger.scheduleId}</>
                                ) : (
                                    <TechnicalDeepLink to={`/technical/resources/${trigger.resourceId}`}>
                                        {triggerEventLabel(trigger)}:{trigger.resourceId}
                                    </TechnicalDeepLink>
                                )}
                            </Typography>
                        ))}
                    </Box>
                )}
                {rule.actionHintResourceIds && rule.actionHintResourceIds.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Action Hints ({rule.actionHintResourceIds.length})</Typography>
                        {rule.actionHintResourceIds.map(id => (
                            <Typography key={id} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                <TechnicalDeepLink to={`/technical/resources/${id}`}>{id}</TechnicalDeepLink>
                            </Typography>
                        ))}
                    </Box>
                )}
            </TileInfoPopover>

            <TileDescriptionPopover description={rule.description} />

            <CardActionArea
                onClick={() => onSelect?.(rule.id)}
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    pt: 3.5,
                    pb: 1,
                    px: 1,
                }}
            >
                <AccountTreeIcon sx={{ fontSize: 32, color: "text.secondary", mb: 0.5 }} />
                <Chip
                    label={target}
                    size="small"
                    color={runtimeStatusChipColor(runtimeStatus)}
                    sx={{ mb: 0.5, fontSize: "0.7rem", height: 20 }}
                />
                <Typography
                    variant="body2"
                    align="center"
                    sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: rule.description ? 1 : 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: "1.2em",
                    }}
                >
                    {displayName}
                </Typography>
                {rule.description && (
                    <Typography
                        variant="caption"
                        align="center"
                        color="text.secondary"
                        sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            lineHeight: "1.3em",
                        }}
                    >
                        {rule.description}
                    </Typography>
                )}
                {rule.triggers.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        {rule.triggers.length} trigger{rule.triggers.length !== 1 ? "s" : ""}
                    </Typography>
                )}
            </CardActionArea>
        </Card>
    );
};
