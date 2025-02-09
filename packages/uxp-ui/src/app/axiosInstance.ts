import axios from "axios";
/* eslint-disable @typescript-eslint/no-explicit-any */

const axiosInstance = axios.create({
    baseURL: "/api", // Adjust baseURL as needed
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
                isRefreshing = false;
                return axiosInstance(originalRequest); // Retry the original request
            } catch (refreshError) {
                processQueue(refreshError, false); // Reject all queued requests
                isRefreshing = false;
                return Promise.reject(refreshError); // Reject the current request
            }
        }

        return Promise.reject(error); // If not 401, reject the error as-is
    }
);

export default axiosInstance;
