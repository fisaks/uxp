import { FileUploadResponse, House } from "@h2c/common";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getBaseUrl } from "../../config";
import { createLoadingErrorAwareThunk } from "../loading-error/loadingErrorSlice";

export const fetcHouses = createLoadingErrorAwareThunk("houses/fetch", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.get<House[]>(`${getBaseUrl()}/api/houses`);
    return response.data;
});

export const addHouse = createAsyncThunk("houses/add", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.post<House>(`${getBaseUrl()}/api/houses`);
    return response.data;
});

export const deleteHouse = createAsyncThunk("houses/delete", async (houseuuid: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await axios.delete(`${getBaseUrl()}/api/houses/${houseuuid}`);
    return houseuuid;
});

export const patchHouseField = createAsyncThunk(
    "house/patchHouseField",
    async ({ entityId, field, value }: { entityId: string; field: string; value?: string }) => {
        const response = await axios.patch<House>(`${getBaseUrl()}/api/houses/${entityId}`, {
            key: field,
            value: value,
        });
        return response.data;
    }
);

export const patchBuildingField = createAsyncThunk(
    "house/patchBuildingField",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ uuid, field, value }: { uuid: string; field: string; value: any }) => {
        const response = await axios.patch<House>(`${getBaseUrl()}/api/house/buildings/${uuid}`, { [field]: value });
        return response.data;
    }
);

export const uploadFile = createAsyncThunk("file", async ({ file }: { file: File }) => {
    const formData = new FormData();

    formData.append("type", "attachment");
    formData.append("file", file);

    const response = await axios.post<FileUploadResponse>(`${getBaseUrl()}/api/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
});
