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
        } else {
            console.log("No supprted error", error);
            return { errors: [{ code: ErrorCodes.INTERNAL_SERVER_ERROR }] } as ApiErrorResponse;
        }
    }

    static isErrorResponse(data: unknown): data is ApiErrorResponse {
        return (
            typeof data === "object" &&
            data !== null &&
            "errors" in data &&
            Array.isArray((data as ApiErrorResponse).errors) &&
            (data as ApiErrorResponse).errors.every((error) => typeof error.code === "string")
        );
    }

    static isAxiosErrorWithErrorResponse(error: unknown): error is AxiosError<ApiErrorResponse> {
        if (this.isAxiosError(error)) {
            const data = error.response?.data;
            return (
                typeof data === "object" &&
                data !== null &&
                "errors" in data &&
                Array.isArray((data as ApiErrorResponse).errors) &&
                (data as ApiErrorResponse).errors.every((error) => typeof error.code === "string")
            );
        }
        return false;
    }
    static getMainErrorCode(error: unknown): ErrorCode {
        return this.getErrorResponse(error).errors[0]?.code || ErrorCodes.INTERNAL_SERVER_ERROR;
    }
}
