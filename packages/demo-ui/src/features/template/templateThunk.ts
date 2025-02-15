import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getBaseUrl } from "../../config";

export const fetchTemplate = createAsyncThunk("template/fetchTemplate", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get(`${getBaseUrl()}/api/template`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return rejectWithValue(error.response?.data ?? "Unknown error");
        }
        return rejectWithValue("An unexpected error occurred");
    }
});
