import { Box, BoxProps, CircularProgress } from "@mui/material";
import React from "react";

export type LoadingProps = {
    fullHeight?: boolean;
    size?: number;
    sx?: BoxProps["sx"]
};

export const Loading: React.FC<LoadingProps> = ({ fullHeight = false, size,sx }) => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: fullHeight ? "100vh" : "auto", // Full height or adjust to content
            ...(sx ?? {}),
        }}
    >
        <CircularProgress size={size} />
    </Box>
);

export const withLoading =
    <T extends object>(WrappedComponent: React.ComponentType<T>): React.FC<T & { isLoading: boolean }> =>
        ({ isLoading, ...restProps }) =>
            isLoading ? <Loading /> : <WrappedComponent {...(restProps as T)} />;
