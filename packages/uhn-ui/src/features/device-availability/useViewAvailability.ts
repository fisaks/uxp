import { isPhysicalResource, RuntimeResource, RuntimeViewAvailability } from "@uhn/common";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectResourceById } from "../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../runtime-state/runtimeStateSelector";
import { selectDeviceAvailabilityMap } from "./deviceAvailabilitySelectors";

const DEFAULT_GRACE_SECONDS = 10;

export type AvailabilityStatus = "ok" | "offline-error" | "offline-warning" | null;

function toDeviceKey(resource: RuntimeResource | undefined): string | undefined {
    if (resource && isPhysicalResource(resource)) {
        return `${resource.edge}:${resource.device}`;
    }
    return undefined;
}

/**
 * Determines the availability indicator status for a view tile.
 *
 * - `null` — no availability configured or no data yet
 * - `"ok"` — device is online
 * - `"offline-error"` — device offline, no poweredBy (red — nothing works)
 * - `"offline-warning"` — device offline, poweredBy is on + grace expired (yellow — mains still works)
 */
export function useViewAvailability(
    availability: RuntimeViewAvailability | undefined,
): AvailabilityStatus {
    const resourceMap = useSelector(selectResourceById);
    const stateMap = useSelector(selectRuntimeStateByResourceId);
    const availabilityMap = useSelector(selectDeviceAvailabilityMap);

    const deviceKey = useMemo(
        () => availability ? toDeviceKey(resourceMap[availability.fromResourceId]) : undefined,
        [availability, resourceMap],
    );

    const deviceAvailable = deviceKey ? availabilityMap[deviceKey]?.available : undefined;

    const poweredByState = availability?.poweredByResourceId
        ? stateMap[availability.poweredByResourceId]?.value
        : undefined;
    const poweredByValue = typeof poweredByState === "boolean" ? poweredByState : undefined;

    const hasPoweredBy = !!availability?.poweredByResourceId;
    const graceSeconds = availability?.graceSeconds ?? DEFAULT_GRACE_SECONDS;
    // Start suppressed when poweredBy is configured — warning only shows after grace timer expires
    const [graceExpired, setGraceExpired] = useState(false);
    const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevPoweredByRef = useRef<boolean | undefined>(undefined);

    const clearGraceTimer = useCallback(() => {
        if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!hasPoweredBy) return;

        const prev = prevPoweredByRef.current;
        prevPoweredByRef.current = poweredByValue;

        if (poweredByValue === true && prev !== true) {
            // Transition to on (including initial): start grace timer
            setGraceExpired(false);
            clearGraceTimer();
            graceTimerRef.current = setTimeout(() => {
                setGraceExpired(true);
                graceTimerRef.current = null;
            }, graceSeconds * 1000);
        } else if (poweredByValue === false) {
            // Mains off: reset grace — suppress warning immediately
            setGraceExpired(false);
            clearGraceTimer();
        }

        return clearGraceTimer;
    }, [poweredByValue, hasPoweredBy, graceSeconds, clearGraceTimer]);

    if (!availability || !deviceKey) return null;
    if (deviceAvailable === undefined) return null;
    if (deviceAvailable) return "ok";

    // No mains control — device is dead
    if (!hasPoweredBy) {
        return "offline-error";
    }

    // Mains off — offline is expected
    if (poweredByValue === false) {
        return null;
    }

    // Mains on — suppress during grace period after power-on
    if (!graceExpired) return null;

    // Mains on, grace expired, still offline — degraded state
    return "offline-warning";
}
