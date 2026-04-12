import { createSelector } from "@reduxjs/toolkit";
import { isResourceTriggerInfo, RuntimeRuleInfo } from "@uhn/common";
import { RootState } from "../../app/store";

const selectRuleState = (state: RootState) => state.rules;

export const selectAllRules = createSelector(
    [selectRuleState],
    (rules): RuntimeRuleInfo[] => rules.allIds.map(id => rules.byId[id])
);

export const selectRulesByResourceId = createSelector(
    [selectAllRules],
    (rules): Record<string, RuntimeRuleInfo[]> => {
        const map: Record<string, RuntimeRuleInfo[]> = {};
        for (const rule of rules) {
            for (const trigger of rule.triggers) {
                if (isResourceTriggerInfo(trigger)) {
                    (map[trigger.resourceId] ??= []).push(rule);
                }
            }
        }
        return map;
    }
);

export const selectRulesByActionHintResourceId = createSelector(
    [selectAllRules],
    (rules): Record<string, RuntimeRuleInfo[]> => {
        const map: Record<string, RuntimeRuleInfo[]> = {};
        for (const rule of rules) {
            if (!rule.actionHintResourceIds) continue;
            for (const id of rule.actionHintResourceIds) {
                (map[id] ??= []).push(rule);
            }
        }
        return map;
    }
);
