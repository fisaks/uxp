import { isScheduleTriggerInfo, RuntimeLocation, RuntimeLocationItem, RuntimeRuleInfo } from "@uhn/common";

/** A link from the schedule popup to a rule or to a tile in the locations view. */
export type ScheduleLinkInfo = {
    label: string;
    link: string;
};

/** The rules that react to a phase of the schedule, by display name, each linking to the rule page. */
export function rulesUsingSchedule(rules: RuntimeRuleInfo[], scheduleId: string): ScheduleLinkInfo[] {
    return rules
        .filter(rule => rule.triggers.some(trigger => isScheduleTriggerInfo(trigger) && trigger.scheduleId === scheduleId))
        .map(rule => ({ label: rule.name ?? rule.description ?? rule.id, link: `/technical/rules/${rule.id}` }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

/** The locations view tile of each location item the schedule is about: one link for every location that has the
 *  item, labelled "Item (Location)". The link scrolls to the tile and highlights it. An item no location has gets none. */
export function locationItemLinks(items: RuntimeLocationItem[] | undefined, locations: RuntimeLocation[]): ScheduleLinkInfo[] {
    const links: ScheduleLinkInfo[] = [];
    for (const wanted of items ?? []) {
        for (const location of locations) {
            const item = location.items.find(i => i.kind === wanted.kind && i.refId === wanted.refId);
            if (!item) continue;
            const params = new URLSearchParams({ highlight: `${item.kind}:${item.refId}`, scrollTo: location.id });
            links.push({ label: `${item.name ?? item.refId} (${location.name ?? location.id})`, link: `/?${params.toString()}` });
        }
    }
    return links;
}
