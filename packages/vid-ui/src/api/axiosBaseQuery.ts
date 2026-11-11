import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { ApiErrorResponse, AxiosUtil } from "@uxp/common";
import { AxiosRequestConfig } from "axios";
import axiosInstance from "./axiosInstance";

export const axiosBaseQuery =
    (): BaseQueryFn<
        { url: string; method?: AxiosRequestConfig["method"]; data?: AxiosRequestConfig["data"]; params?: AxiosRequestConfig["params"] },
        unknown,
        ApiErrorResponse
    > =>
    async ({ url, method = "GET", data, params }) => {
        try {
            const result = await axiosInstance({ url, method, data, params });
            return { data: result.data };
        } catch (error) {
            return { error: AxiosUtil.getErrorResponse(error) };
        }
    };
