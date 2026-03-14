import { createSelector } from "@reduxjs/toolkit";
import { RuntimeRuleInfo } from "@uhn/common";
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
                (map[trigger.resourceId] ??= []).push(rule);
            }
        }
        return map;
    }
);
