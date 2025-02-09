import { FileUploadResponse, House } from "@h2c/common";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getBaseUrlApi } from "../../config";
import { createLoadingErrorAwareThunk } from "../loading-error/loadingErrorSlice";


export const fetcHouses = createLoadingErrorAwareThunk('houses/fetch',
    async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await axios.get<House[]>(`${getBaseUrlApi()}/houses`);
        return response.data;

    });

export const addHouse = createAsyncThunk(
    'houses/add',
    async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await axios.post<House>(`${getBaseUrlApi()}/houses`);
        return response.data;
    }
);

export const deleteHouse = createAsyncThunk(
    'houses/delete',
    async (houseuuid: string) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await axios.delete(`${getBaseUrlApi()}/houses/${houseuuid}`);
        return houseuuid;
    }
);


export const patchHouseField = createAsyncThunk(
    'house/patchHouseField',
    async ({ entityId, field, value }: { entityId: string, field: string; value?: string }) => {

        const response = await axios.patch<House>(`${getBaseUrlApi()}/houses/${entityId}`, {
            key: field,
            value: value
        });
        return response.data;

    }
);

export const patchBuildingField = createAsyncThunk(
    'house/patchBuildingField',
    async ({ uuid, field, value }: { uuid: string; field: string; value: any }, { rejectWithValue }) => {

        const response = await axios.patch<House>(`${getBaseUrlApi()}/house/buildings/${uuid}`, { [field]: value });
        return response.data;

    }
);

export const uploadFile = createAsyncThunk(
    'file',
    async ({ uuid, file }: { uuid: string; file: File }, { rejectWithValue }) => {
        const formData = new FormData();
       
        formData.append('type', "attachment");
        formData.append('file', file);

        const response = await axios.post<FileUploadResponse>(`${getBaseUrlApi()}/file`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;

    }
);
