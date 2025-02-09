import { ErrorCode } from "./ErrorCodes";
export interface ErrorDetail {
    code: ErrorCode;
    message?: string;
    params?: Record<string, string | number>;
}
export interface ApiErrorResponse {
    errors: ErrorDetail[];
    details?: {
        timestamp: string;
        path: string;
        correlationId: string;
    };
}
export type MessageErrorResponse = {
    error: ErrorDetail;
};
//# sourceMappingURL=error.types.d.ts.map