import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Checkbox, Chip, Typography } from "@mui/material";
import { isPriceTriggerInfo, RuntimeRuleInfo } from "@uhn/common";
import React from "react";
import { TechnicalDeepLink } from "../../shared/TechnicalDeepLink";
import { triggerEventLabel } from "../../shared/triggerEventLabel";
import { getRuleLimits, limitColor } from "../priceLimits";

type PriceRulesSectionProps = {
    rules: RuntimeRuleInfo[];
    selectedRuleIds: Set<string>;
    onToggleRule: (ruleId: string) => void;
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
};

/** Expandable list of the rules with price triggers. Checked rules show their limits on the chart. */
export const PriceRulesSection: React.FC<PriceRulesSectionProps> = ({ rules, selectedRuleIds, onToggleRule, expanded, onExpandedChange }) => {
    if (rules.length === 0) return null;

    return (
        <Accordion
            expanded={expanded}
            onChange={(_event, isExpanded) => onExpandedChange(isExpanded)}
            disableGutters
            variant="outlined"
            sx={{ borderRadius: 2, mb: 3, "&:before": { display: "none" } }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    Rules with price triggers ({rules.length})
                </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
                {rules.map((rule, index) => {
                    const hasLimits = getRuleLimits(rule).length > 0;
                    const color = limitColor(index);
                    return (
                        <Box
                            key={rule.id}
                            sx={{ display: "flex", alignItems: "flex-start", gap: 1, py: 1, borderTop: 1, borderColor: "divider" }}
                        >
                            <Checkbox
                                size="small"
                                checked={selectedRuleIds.has(rule.id) && hasLimits}
                                disabled={!hasLimits}
                                onChange={() => onToggleRule(rule.id)}
                                sx={{ p: 0.5, color, "&.Mui-checked": { color } }}
                                slotProps={{ input: { "aria-label": `Show limits of ${rule.name ?? rule.id} on the chart` } }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        <TechnicalDeepLink to={`/technical/rules/${rule.id}`}>{rule.name ?? rule.id}</TechnicalDeepLink>
                                    </Typography>
                                    <Chip size="small" variant="outlined" label={rule.executionTarget ?? "master"} />
                                    {!hasLimits && (
                                        <Typography variant="caption" color="text.secondary">no fixed limit to show</Typography>
                                    )}
                                </Box>
                                {rule.description && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                        {rule.description}
                                    </Typography>
                                )}
                                {rule.triggers.filter(isPriceTriggerInfo).map((trigger, i) => (
                                    <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                        {triggerEventLabel(trigger)}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                    );
                })}
            </AccordionDetails>
        </Accordion>
    );
};
