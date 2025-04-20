import { HouseCreateVersionPayload, HouseCreateVersionResponse, HouseGetVersionResponse } from "@h2c/common";
import { AxiosUtil } from "@uxp/common";
import axios from "axios";
import { getBaseUrl } from "../../config";

export const createHouseVersion = async ({ uuidHouse, label }: { uuidHouse: string; label?: string }) => {
    try {
        const response = await axios.post<HouseCreateVersionResponse>(`${getBaseUrl()}/api/houses/${uuidHouse}/versions`, {
            label,
        } satisfies HouseCreateVersionPayload);
        return response.data;
    } catch (e: unknown) {
        const error = AxiosUtil.getErrorResponse(e);
        throw error;
    }
};

export const fetchHouseVersion = async (uuidHouse: string, version: number) => {
    try {
        const response = await axios.get<HouseGetVersionResponse>(`${getBaseUrl()}/api/houses/${uuidHouse}/versions/${version}`);
        return response.data;
    } catch (e: unknown) {
        const error = AxiosUtil.getErrorResponse(e);
        throw error;
    }
};
