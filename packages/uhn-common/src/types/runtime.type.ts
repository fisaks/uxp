export type ResourceStateValue = boolean | number;

export type RuntimeResourceState = {
    resourceId: string;
    value: ResourceStateValue | undefined;
    timestamp: number;
};
