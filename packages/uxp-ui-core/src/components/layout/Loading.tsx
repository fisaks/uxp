import { Box, CircularProgress } from "@mui/material";
import React from "react";

type LoadingProps = {
    fullHeight?: boolean;
};

export const Loading: React.FC<LoadingProps> = ({ fullHeight = false }) => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: fullHeight ? "100vh" : "auto", // Full height or adjust to content
        }}
    >
        <CircularProgress />
    </Box>
);

export const withLoading =
    <T extends object>(WrappedComponent: React.ComponentType<T>): React.FC<T & { isLoading: boolean }> =>
    ({ isLoading, ...restProps }) =>
        isLoading ? <Loading /> : <WrappedComponent {...(restProps as T)} />;
