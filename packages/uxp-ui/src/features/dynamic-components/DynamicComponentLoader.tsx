import { Loading } from "@uxp/ui-lib";
import React, { Suspense } from "react";
import componentMap from "./componentMap";
import DynamicComponentErrorBoundary from "./DynamicComponentErrorBoundary";

interface DynamicComponentLoaderProps {
    componentName: string;
    basePath: string | undefined;
    props?: Record<string, any | undefined>;
}

const DynamicComponentLoader: React.FC<DynamicComponentLoaderProps> = ({ componentName, basePath, props = {} }) => {
    const Component = componentMap[componentName as keyof typeof componentMap];

    if (!Component) {
        return <div>Error: Component {componentName} not found.</div>;
    }

    return (
        <DynamicComponentErrorBoundary>
            <Suspense fallback={<Loading />}>
                <Component basePath={basePath} {...(props ? props : {})} />
            </Suspense>
        </DynamicComponentErrorBoundary>
    );
};

export default DynamicComponentLoader;
