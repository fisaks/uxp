import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import axios, { AxiosRequestConfig } from "axios";
import axiosInstance from "./axiosInstance";

export type ApiError = { status?: number; message: string | undefined };

/** The text the BFF answered a failed request with, if it gave one. */
export const errorMessage = (error: unknown): string | undefined => (axios.isAxiosError(error) ? error.response?.data?.message : undefined);

export const axiosBaseQuery =
    (): BaseQueryFn<
        { url: string; method?: AxiosRequestConfig["method"]; data?: AxiosRequestConfig["data"]; params?: AxiosRequestConfig["params"] },
        unknown,
        ApiError
    > =>
    async ({ url, method = "GET", data, params }) => {
        try {
            const result = await axiosInstance({ url, method, data, params });
            return { data: result.data };
        } catch (error) {
            return { error: { status: axios.isAxiosError(error) ? error.response?.status : undefined, message: errorMessage(error) } };
        }
    };
