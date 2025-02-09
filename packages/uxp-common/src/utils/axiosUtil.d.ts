import { AxiosError } from "axios";
import { ApiErrorResponse } from "../error/error.types";
export declare class AxiosUtil {
    static isAxiosError(error: unknown): error is AxiosError;
    static handleAxiosError<T>(error: unknown, callback: (axiosError: AxiosError) => T): T;
    static getErrorResponse(error: unknown): ApiErrorResponse;
    static isErrorResponse(data: unknown): data is ApiErrorResponse;
    static isAxiosErrorWithErrorResponse(error: unknown): error is AxiosError<ApiErrorResponse>;
}
//# sourceMappingURL=axiosUtil.d.ts.map