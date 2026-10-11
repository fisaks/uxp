import { PaletteItem } from "./commandPalette.types";

/**
 * Electricity price questions. Order matters for voice: when a spoken query matches several
 * items ("electricity price today"), the first match wins, so the most general item comes first.
 */
export const electricityQueryItems: PaletteItem[] = [
    {
        id: "action:electricity-price:current",
        label: "Current electricity price",
        group: "Actions",
        searchText: "actions electricity price current now cost rate energy power",
        action: { type: "answer-electricity-price", query: "current" },
    },
    {
        id: "action:electricity-price:hour",
        label: "Electricity price this hour",
        group: "Actions",
        searchText: "actions electricity price this hour cost rate energy power",
        action: { type: "answer-electricity-price", query: "hour" },
    },
    {
        id: "action:electricity-price:next-hour",
        label: "Electricity price next hour",
        group: "Actions",
        searchText: "actions electricity price next hour cost rate energy power",
        action: { type: "answer-electricity-price", query: "next-hour" },
    },
    {
        id: "action:electricity-price:today-average",
        label: "Average electricity price today",
        group: "Actions",
        searchText: "actions electricity price average today cost rate energy power",
        action: { type: "answer-electricity-price", query: "today-average" },
    },
    {
        id: "action:electricity-price:tomorrow-average",
        label: "Average electricity price tomorrow",
        group: "Actions",
        searchText: "actions electricity price average tomorrow cost rate energy power",
        action: { type: "answer-electricity-price", query: "tomorrow-average" },
    },
    {
        id: "action:electricity-price:today-cheapest",
        label: "Cheapest electricity hour today",
        group: "Actions",
        searchText: "actions electricity price cheapest lowest hour today cost rate energy power",
        action: { type: "answer-electricity-price", query: "today-cheapest" },
    },
    {
        id: "action:electricity-price:today-most-expensive",
        label: "Most expensive electricity hour today",
        group: "Actions",
        searchText: "actions electricity price most expensive highest hour today cost rate energy power",
        action: { type: "answer-electricity-price", query: "today-most-expensive" },
    },
];
