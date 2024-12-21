import { Loading } from "@uxp/ui-lib";
import React, { Suspense } from "react";
import componentMap from "./componentMap";
import DynamicComponentErrorBoundary from "./DynamicComponentErrorBoundary";

interface DynamicComponentLoaderProps {
    componentName: string;
    props?: Record<string, any>;
}

const DynamicComponentLoader: React.FC<DynamicComponentLoaderProps> = ({ componentName, props = {} }) => {
    const Component = componentMap[componentName as keyof typeof componentMap];

    if (!Component) {
        return <div>Error: Component {componentName} not found.</div>;
    }

    return (
        <DynamicComponentErrorBoundary>
            <Suspense fallback={<Loading />}>
                <Component {...props} />
            </Suspense>
        </DynamicComponentErrorBoundary>
    );
};

export default DynamicComponentLoader;
