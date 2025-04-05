import { FieldKeyType, FieldKeyWithType, GetFieldKeyByTypeResponse, NewFieldKeyPayload, RemoveFieldKeyPayload } from "@h2c/common";
import axios from "axios";
import { getBaseUrl } from "../../config";
import { createLoadingErrorAwareThunk } from "../loading-error/loadingErrorSlice";

export const fetchFieldsByType = createLoadingErrorAwareThunk("fieldKeys/fetch", async (types: FieldKeyType | FieldKeyType[]) => {
    //const typeList = Array.isArray(types) ? types : [types];
    //await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await axios.get<GetFieldKeyByTypeResponse>(`${getBaseUrl()}/api/field-keys`,
        {
            params: { types },
        });
    return response.data;
});

export const addKey = createLoadingErrorAwareThunk("fieldKeys/add", async (payload: NewFieldKeyPayload) => {
    //await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await axios.put<FieldKeyWithType>(`${getBaseUrl()}/api/field-keys`, payload);

    return response.data;
});

export const removeKey = createLoadingErrorAwareThunk("fieldKeys/remove", async (payload: RemoveFieldKeyPayload) => {
    //await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await axios.delete<FieldKeyWithType>(`${getBaseUrl()}/api/field-keys`, {
        params: payload
    });

    return response.data;
});