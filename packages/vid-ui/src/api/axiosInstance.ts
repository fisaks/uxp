/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

/**
 * Axios that asks for a new access token when a request is answered with 401, and then sends the request again. Requests that
 * arrive while the token is being renewed wait for it. It is the same as in the other apps of the platform.
 */
const axiosInstance = axios.create({
    baseURL: "", // we have no fixed baseURL, it is set in each request
    withCredentials: true,
});

let isRefreshing = false; // To track if a token refresh is in progress
let failedQueue: any[] = []; // Queue for requests waiting for token refresh

const processQueue = (error: any, success: boolean = false) => {
    failedQueue.forEach((prom) => {
        if (success) {
            prom.resolve();
        } else {
            prom.reject(error);
        }
    });
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue the request if a token refresh is already in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => axiosInstance(originalRequest)) // Retry the original request
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true; // Mark request to prevent looping
            isRefreshing = true;

            try {
                await axios.post("/api/refresh-token", {}, { withCredentials: true }); // Refresh the token
                processQueue(null, true); // Resolve all queued requests
                return axiosInstance(originalRequest); // Retry the original request
            } catch (refreshError) {
                processQueue(refreshError, false); // Reject all queued requests
                return Promise.reject(refreshError); // Reject the current request
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error); // If not 401, reject the error as-is
    }
);

export default axiosInstance;
