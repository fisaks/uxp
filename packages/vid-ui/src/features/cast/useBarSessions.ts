import { CastSessionSnapshot } from "@vid/common";
import { useLocation } from "react-router-dom";
import { PLAYER_PATH } from "../../menu";
import { useCast } from "./useCast";

/** The sessions the bar at the bottom has a row for: none on a player page, which is the bar in full. */
export const useBarSessions = (): CastSessionSnapshot[] => {
    const { pathname } = useLocation();
    const sessions = useCast().state?.sessions ?? [];
    return pathname.startsWith(`${PLAYER_PATH}/`) ? [] : sessions;
};
