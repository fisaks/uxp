import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getBaseUrlApi } from "../../config";

export const fetchTemplate = createAsyncThunk("template/fetchTemplate", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get(`${getBaseUrlApi()}/template`);
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});
