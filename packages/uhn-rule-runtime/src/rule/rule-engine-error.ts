import { ResourceError, ResourceMissingIdError, ResourceStateNotAvailableError, ResourceStateTypeMismatchError } from "@uhn/common";

export const createResourceErrorData = (error: ResourceError) => {
    if (error instanceof ResourceStateNotAvailableError) {
        return {
            resourceId: error.resourceId,
            resourceType: error.resourceType,
            reason: "stateUnavailable" as const,
        };
    }

    else if (error instanceof ResourceMissingIdError) {
        return {
            resourceType: error.resourceType,
            reason: "missingResourceId" as const,
        };
    }

    else if (error instanceof ResourceStateTypeMismatchError) {
        return {
            resourceId: error.resourceId,
            resourceType: error.resourceType,
            reason: "typeMismatch" as const,
            actualValue: error.actualValue,
        };
    }
    return {
        resourceId: error.resourceId,
        resourceType: error.resourceType,
        reason: "generalError" as const,
    }
};
