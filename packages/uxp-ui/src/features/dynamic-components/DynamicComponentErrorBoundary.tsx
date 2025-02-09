import React, { Component, ReactNode } from "react";

interface DynamicComponentErrorBoundaryProps {
    children: ReactNode;
}

interface DynamicComponentErrorBoundaryState {
    hasError: boolean;
}

class DynamicComponentErrorBoundary extends Component<DynamicComponentErrorBoundaryProps, DynamicComponentErrorBoundaryState> {
    constructor(props: DynamicComponentErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): DynamicComponentErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error("Error caught by ErrorBoundary:", error, errorInfo);
        // Optionally, you can log this to a monitoring service
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return <div>Error loading component.</div>;
        }
        return this.props.children;
    }
}

export default DynamicComponentErrorBoundary;
