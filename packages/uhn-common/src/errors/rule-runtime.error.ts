import { ResourceType } from "@uhn/blueprint";

export abstract class ResourceError extends Error {
    constructor(
        message: string,
        public readonly resourceType: ResourceType,
        public readonly resourceId?: string,
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ResourceStateNotAvailableError extends ResourceError {
    constructor(
        public readonly resourceId: string,
        public readonly resourceType: ResourceType,
        message: string,
    ) {
        super(message, resourceType, resourceId);
    }
}

export class ResourceStateTypeMismatchError extends ResourceError {
    constructor(
        public readonly resourceId: string,
        public readonly resourceType: ResourceType,
        public readonly actualValue: unknown,
    ) {
        super(
            `State type mismatch for resource "${resourceId}" of type "${resourceType}"`,
            resourceType,
            resourceId
        );

    }
}

export class ResourceMissingIdError extends ResourceError {
    constructor(public readonly resourceType: ResourceType,
        message?: string
    ) {
        super(
            message ?? `Resource is missing required "id" property`,
            resourceType
        );

    }
}
