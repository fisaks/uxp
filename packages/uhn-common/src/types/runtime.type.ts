export type ResourceStateValue = boolean | number | string | undefined;

export type RuntimeResourceState = {
    resourceId: string;
    value: ResourceStateValue;
    timestamp: number;
};
