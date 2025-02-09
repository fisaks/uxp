import "reflect-metadata";

const QUERYRUNNER_METADATA_KEY = Symbol("db:queryRunner");

export interface UseQueryRunnerOptions {
    transactional?: boolean; // Indicates if the connection should start a transaction
}

/**
 * QueryRunner decorator for injecting a QueryRunner into handlers
 * @param options Options for the QueryRunner, e.g., transactional
 */
export function UseQueryRunner(options: UseQueryRunnerOptions = {}): MethodDecorator {
    return (target, propertyKey: string | symbol) => {
        Reflect.defineMetadata(QUERYRUNNER_METADATA_KEY, options, target, propertyKey);
    };
}

/**
 * Retrieve QueryRunner options for a handler
 * @param target The target object
 * @param propertyKey The method name
 * @returns UseQueryRunnerOptions if the handler is annotated, otherwise null
 */
export function getUseQueryRunnerOptions(target: Record<string, unknown>, propertyKey: string | symbol): UseQueryRunnerOptions | null {
    return Reflect.getMetadata(QUERYRUNNER_METADATA_KEY, target, propertyKey) || null;
}
