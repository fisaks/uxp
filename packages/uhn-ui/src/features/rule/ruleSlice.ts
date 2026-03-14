import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RuntimeRuleInfo, UhnRulesResponse } from "@uhn/common";

export type RulesState = {
    byId: Record<string, RuntimeRuleInfo>;
    allIds: string[];
    isLoaded: boolean;
};

const initialState: RulesState = {
    byId: {},
    allIds: [],
    isLoaded: false,
};

const rulesSlice = createSlice({
    name: "rules",
    initialState,
    reducers: {
        rulesLoaded(state, action: PayloadAction<{ response: UhnRulesResponse }>) {
            state.byId = {};
            state.allIds = [];
            for (const rule of action.payload.response.rules) {
                state.byId[rule.id] = rule;
                state.allIds.push(rule.id);
            }
            state.isLoaded = true;
        },
    },
});

export const { rulesLoaded } = rulesSlice.actions;
export default rulesSlice.reducer;
