import axios, { AxiosError } from "axios";
import { ApiErrorResponse } from "../error/error.types";
import { ErrorCode, ErrorCodes } from "../error/ErrorCodes";

export class AxiosUtil {
    static isAxiosError(error: unknown): error is AxiosError {
        return axios.isAxiosError(error);
    }

    static handleAxiosError<T>(error: unknown, callback: (axiosError: AxiosError) => T): T {
        if (this.isAxiosError(error)) {
            return callback(error);
        } else {
            throw error;
        }
    }
    static getErrorResponse(error: unknown): ApiErrorResponse {
        if (this.isAxiosError(error) && this.isErrorResponse(error.response?.data)) {
            return error.response.data;
        }
        if (this.isAxiosError(error) && !error.response) {
            const timedOut = error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT;
            return { error: { code: timedOut ? ErrorCodes.TIMEOUT : ErrorCodes.DISCONNECTED } };
        }
        console.warn("Unsupported error response", this.isAxiosError(error) ? `${error.code} ${error.response?.status}` : error);
        return { error: { code: ErrorCodes.INTERNAL_SERVER_ERROR } };
    }

    static isErrorResponse(data: unknown): data is ApiErrorResponse {
        return (
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as ApiErrorResponse).error?.code === "string"
        );
    }

    static isAxiosErrorWithErrorResponse(error: unknown): error is AxiosError<ApiErrorResponse> {
        return this.isAxiosError(error) && this.isErrorResponse(error.response?.data);
    }

    static getMainErrorCode(error: unknown): ErrorCode {
        return this.getErrorResponse(error).error.code;
    }
}
