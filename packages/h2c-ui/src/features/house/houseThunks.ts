import { House } from "@h2c/common";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosUtil } from "@uxp/common";
import axios from "axios";
import { getBaseUrl } from "../../config";
import { createLoadingErrorAwareThunk } from "../loading-error/loadingErrorSlice";

export const fetcHouses = createLoadingErrorAwareThunk("houses/fetch", async () => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.get<House[]>(`${getBaseUrl()}/api/houses`);
    return response.data;
});

export const addHouse = createAsyncThunk("houses/add", async () => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.post<House>(`${getBaseUrl()}/api/houses`);
    return response.data;
});

export const deleteHouse = createAsyncThunk("houses/delete", async (houseuuid: string) => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    await axios.delete(`${getBaseUrl()}/api/houses/${houseuuid}`);
    return houseuuid;
});

export const patchHouseField = createAsyncThunk(
    "house/patchHouseField",
    async ({ entityId, field, value }: { entityId: string; field: string; value?: string }, { rejectWithValue }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            const response = await axios.patch<House>(`${getBaseUrl()}/api/houses/${entityId}`, {
                key: field,
                value: value,
            });
            return response.data;
        } catch (e: unknown) {
            const error = AxiosUtil.getErrorResponse(e);
            return rejectWithValue(error);
        }
    }
);

export const addBuilding = createAsyncThunk("houses/building/add", async (houseuuid: string) => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.post<House>(`${getBaseUrl()}/api/houses/${houseuuid}/buildings`);
    return response.data;
});
type RemoveBuildingParams = { houseUuid: string; buildingUuid: string }


export const removeBuilding = createAsyncThunk("houses/building/remove", async ({ houseUuid, buildingUuid }: RemoveBuildingParams) => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.delete<House>(`${getBaseUrl()}/api/houses/${houseUuid}/buildings/${buildingUuid}`);
    return response.data;
});


export const patchBuildingField = createAsyncThunk(
    "house/patchBuildingField",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ uuidHouse, uuidBuilding, field, value }: { uuidHouse: string; uuidBuilding: string, field: string; value?: string }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await axios.patch<House>(`${getBaseUrl()}/api/houses/${uuidHouse}/buildings/${uuidBuilding}`, {
            key: field,
            value: value,
        });
        return response.data;
    }
);
