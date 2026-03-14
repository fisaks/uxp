import { RuntimeResource, RuntimeRuleInfo } from "@uhn/common";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type RulePageState = {
    selectedRuleIds?: string[];
    extraResourceIds?: string[];
    removedResourceIds?: string[];
    orderedResourceIds?: string[];
};

type UseRulePageStateOptions = {
    allRules: RuntimeRuleInfo[];
    resourceById: Record<string, RuntimeResource>;
    highlightedTileId: string | undefined;
};

export function useRulePageState({ allRules, resourceById, highlightedTileId }: UseRulePageStateOptions) {
    const location = useLocation();
    const navigate = useNavigate();

    const pageState = (location.state as RulePageState | null) ?? {};

    const selectedRuleIds = useMemo(
        () => new Set(pageState.selectedRuleIds ?? []),
        [pageState.selectedRuleIds]
    );
    const extraResourceIds = useMemo(
        () => pageState.extraResourceIds ?? [],
        [pageState.extraResourceIds]
    );
    const removedResourceIds = useMemo(
        () => new Set(pageState.removedResourceIds ?? []),
        [pageState.removedResourceIds]
    );

    const updatePageState = useCallback((patch: Partial<RulePageState>, push: boolean) => {
        const merged: RulePageState = { ...pageState, ...patch };
        navigate(location.pathname + location.search, { replace: !push, state: merged, preventScrollReset: true });
    }, [navigate, pageState, location.pathname, location.search]);

    const selectedRules = useMemo(
        () => allRules.filter(r => selectedRuleIds.has(r.id)),
        [allRules, selectedRuleIds]
    );

    // All resource IDs derived from selected rules (triggers + action hints).
    // Used by handleRemoveResource to decide whether to add to removedResourceIds.
    const ruleResourceIds = useMemo(() => {
        const set = new Set<string>();
        for (const rule of selectedRules) {
            for (const trigger of rule.triggers) {
                set.add(trigger.resourceId);
            }
            if (rule.actionHintResourceIds) {
                for (const id of rule.actionHintResourceIds) {
                    set.add(id);
                }
            }
        }
        return set;
    }, [selectedRules]);

    const storedOrder = useMemo(
        () => pageState.orderedResourceIds ?? [],
        [pageState.orderedResourceIds]
    );

    // Compute which resource IDs should be displayed (unordered)
    const displayedResourceIdSet = useMemo(() => {
        const seen = new Set<string>();
        for (const rule of selectedRules) {
            for (const trigger of rule.triggers) {
                seen.add(trigger.resourceId);
            }
            if (rule.actionHintResourceIds) {
                for (const id of rule.actionHintResourceIds) {
                    seen.add(id);
                }
            }
        }
        for (const id of extraResourceIds) {
            seen.add(id);
        }
        for (const id of removedResourceIds) {
            seen.delete(id);
        }
        return seen;
    }, [selectedRules, extraResourceIds, removedResourceIds]);

    // Apply stored ordering: keep stored items that are still displayed, append new ones
    const orderedResourceIds = useMemo(() => {
        const kept = storedOrder.filter(id => displayedResourceIdSet.has(id));
        const keptSet = new Set(kept);
        const added: string[] = [];
        // Add trigger resources first, then action hints (in rule order), then extras
        for (const rule of selectedRules) {
            for (const trigger of rule.triggers) {
                if (!keptSet.has(trigger.resourceId) && displayedResourceIdSet.has(trigger.resourceId)) {
                    keptSet.add(trigger.resourceId);
                    added.push(trigger.resourceId);
                }
            }
            if (rule.actionHintResourceIds) {
                for (const id of rule.actionHintResourceIds) {
                    if (!keptSet.has(id) && displayedResourceIdSet.has(id)) {
                        keptSet.add(id);
                        added.push(id);
                    }
                }
            }
        }
        for (const id of extraResourceIds) {
            if (!keptSet.has(id) && displayedResourceIdSet.has(id)) {
                keptSet.add(id);
                added.push(id);
            }
        }
        return [...kept, ...added];
    }, [storedOrder, displayedResourceIdSet, selectedRules, extraResourceIds]);

    const handleSelectRule = useCallback((ruleId: string) => {
        const next = new Set(selectedRuleIds);
        const selecting = !next.has(ruleId);
        if (selecting) {
            next.add(ruleId);
        } else {
            next.delete(ruleId);
        }

        // When re-selecting a rule, clear removals for its trigger and action hint resources
        // so they reappear. Removals for other rules' resources stay intact.
        let newRemoved = [...removedResourceIds];
        if (selecting) {
            const rule = allRules.find(r => r.id === ruleId);
            if (rule) {
                const ruleIds = new Set([
                    ...rule.triggers.map(t => t.resourceId),
                    ...(rule.actionHintResourceIds ?? []),
                ]);
                newRemoved = newRemoved.filter(id => !ruleIds.has(id));
            }
        }

        const patch = { selectedRuleIds: [...next], removedResourceIds: newRemoved };
        const merged: RulePageState = { ...pageState, ...patch };
        const push = selectedRuleIds.size === 0;
        // Clear deep link :itemId from URL on first interaction so the highlight
        // doesn't pin and the auto-select effect stops re-firing.
        const basePath = highlightedTileId ? "/technical/rules" : location.pathname;
        navigate(basePath + location.search, { replace: !push, state: merged, preventScrollReset: true });
    }, [highlightedTileId, selectedRuleIds, removedResourceIds, allRules, pageState, navigate, location.pathname, location.search]);

    const handleManualAddResource = useCallback((_: unknown, value: RuntimeResource | null) => {
        if (!value) return;
        const newExtra = extraResourceIds.includes(value.id) ? extraResourceIds : [...extraResourceIds, value.id];
        const newRemoved = [...removedResourceIds].filter(id => id !== value.id);
        const newOrder = orderedResourceIds.includes(value.id) ? orderedResourceIds : [...orderedResourceIds, value.id];
        updatePageState({ extraResourceIds: newExtra, removedResourceIds: newRemoved, orderedResourceIds: newOrder }, false);
    }, [extraResourceIds, removedResourceIds, orderedResourceIds, updatePageState]);

    const handleRemoveResource = useCallback((id: string) => {
        // Remove from extra if present
        const newExtra = extraResourceIds.filter(e => e !== id);
        // Add to removed if it's a trigger resource
        const newRemoved = ruleResourceIds.has(id) && !removedResourceIds.has(id)
            ? [...removedResourceIds, id]
            : [...removedResourceIds];
        const newOrder = orderedResourceIds.filter(r => r !== id);
        updatePageState({ extraResourceIds: newExtra, removedResourceIds: newRemoved, orderedResourceIds: newOrder }, false);
    }, [extraResourceIds, removedResourceIds, ruleResourceIds, orderedResourceIds, updatePageState]);

    const handleReorderResources = useCallback((reordered: string[]) => {
        updatePageState({ orderedResourceIds: reordered }, false);
    }, [updatePageState]);

    const handleRemoveAllResources = useCallback(() => {
        const merged = new Set([...removedResourceIds, ...orderedResourceIds]);
        updatePageState({ extraResourceIds: [], removedResourceIds: [...merged], orderedResourceIds: [] }, false);
    }, [removedResourceIds, orderedResourceIds, updatePageState]);

    return {
        selectedRuleIds,
        orderedResourceIds,
        handleSelectRule,
        handleManualAddResource,
        handleRemoveResource,
        handleRemoveAllResources,
        handleReorderResources,
        /** Pass to useTechnicalSearch as locationState */
        locationState: location.state,
        /** Replace-navigate to auto-select deep-linked tile */
        updatePageState,
    } satisfies UseRulePageStateResult;
}

type UseRulePageStateResult = {
    /** Set of currently selected rule IDs (used to highlight tiles and derive trigger resources). */
    selectedRuleIds: Set<string>;
    /** Resource IDs to display in the detail panel, ordered by stored drag-and-drop order. */
    orderedResourceIds: string[];
    /** Toggle-select a rule tile. Clears deep link :itemId on first interaction. */
    handleSelectRule: (ruleId: string) => void;
    /** Autocomplete onChange handler — manually adds a resource to the detail panel (e.g. action targets). */
    handleManualAddResource: (_: unknown, value: RuntimeResource | null) => void;
    /** Remove a resource from the detail panel (hides trigger resources, deletes extras). */
    handleRemoveResource: (id: string) => void;
    /** Remove all resources from the detail panel (clears extras, marks all trigger resources as removed). */
    handleRemoveAllResources: () => void;
    /** Persist a new drag-and-drop ordering of resources. */
    handleReorderResources: (reordered: string[]) => void;
    /** Raw location.state — pass to useTechnicalSearch to restore search term across navigations. */
    locationState: unknown;
    /** Replace-navigate with a state patch (e.g. auto-select deep-linked tile). */
    updatePageState: (patch: Partial<RulePageState>, push: boolean) => void;
};
