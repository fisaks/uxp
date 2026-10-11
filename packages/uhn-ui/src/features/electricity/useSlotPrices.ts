import { ElectricityPriceEntry } from "@uhn/common";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectElectricitySnapshot } from "./electricitySlice";

const QUARTER_MS = 15 * 60_000;

/** Current time, refreshed just after each quarter-hour boundary (where price slots, hours and days change). */
export function useSlotMs(): number {
    const [slotMs, setSlotMs] = useState(() => Date.now());
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const scheduleNext = () => {
            const now = Date.now();
            timer = setTimeout(() => {
                setSlotMs(Date.now());
                scheduleNext();
            }, QUARTER_MS - (now % QUARTER_MS) + 50);
        };
        scheduleNext();
        return () => clearTimeout(timer);
    }, []);
    return slotMs;
}

/** The price slot that is running now and the one after it (undefined when not in the data). */
export function useCurrentAndNextSlotPrice(): { current?: ElectricityPriceEntry; next?: ElectricityPriceEntry } {
    const { prices } = useSelector(selectElectricitySnapshot);
    const slotMs = useSlotMs();
    return useMemo(() => {
        const currentStartMs = Math.floor(slotMs / QUARTER_MS) * QUARTER_MS;
        const slotAt = (startMs: number) => prices.find((p) => new Date(p.startDate).getTime() === startMs);
        return { current: slotAt(currentStartMs), next: slotAt(currentStartMs + QUARTER_MS) };
    }, [prices, slotMs]);
}
