import React from 'react';
import { ErrorDisplay, ErrorDisplayProps } from './ErrorDisplay';
import { Loading, LoadingProps } from './Loading';

type AsyncContentProps = {
    loading: boolean;
    props?: {
        loading?: LoadingProps,
        error?: Omit<ErrorDisplayProps, "onRetry" | "message">;
    }

    error?: string;
    noContent?: boolean | string;
    onRetry?: () => void;
    children: React.ReactNode;
};

export function AsyncContent({
    loading,
    props,
    error,
    onRetry,
    noContent,
    children,
}: AsyncContentProps) {
    if (loading) return <Loading {...(props?.loading ?? {})} />;
    if (error) return <ErrorDisplay {...(props?.error ?? {})} message={error} onRetry={onRetry} />;
    if (noContent) return <ErrorDisplay message={typeof noContent === "string" ? noContent : "No Content loaded"} onRetry={onRetry} />;
    return <>{children}</>;
}
