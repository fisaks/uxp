import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchTemplate = createAsyncThunk("template/fetchTemplate", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/api/template");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});
