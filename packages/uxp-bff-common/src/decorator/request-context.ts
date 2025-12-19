import { AsyncLocalStorage } from "async_hooks";

import type { DataSource, QueryRunner } from "typeorm";
import { Token } from "../types/token.types";
import { RequestMetaData } from "../utils/AppLogger";

export interface RequestContext {
    requestMeta?: RequestMetaData;
    user?: Token;
    queryRunner?: QueryRunner;
    // Add anything else needed per request
}

const asyncRequestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
    ctx: RequestContext,
    fn: () => Promise<T> | T
) {
    return asyncRequestContext.run(ctx, fn);
}

export function getRequestContext(required = false): RequestContext {
    const ctx = asyncRequestContext.getStore();
    if (!ctx && required) throw new Error("No request context is set!");
    return ctx ?? {};
}

export async function runBackgroundTask<T>(dataSource: DataSource, fn: () => Promise<T> | T) {
    const queryRunner = dataSource.createQueryRunner();
    try {
        await queryRunner.connect();
        return await runWithRequestContext({ queryRunner }, fn);
    } finally {
        await queryRunner.release();
    }
}
