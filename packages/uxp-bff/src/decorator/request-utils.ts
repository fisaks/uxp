import { UserRole } from "@uxp/common";
import { ValidateFunction } from "ajv";
import { DataSource, QueryRunner } from "typeorm";
import { UseQueryRunnerOptions } from "./queryrunner.decorator";

type HasRequiredRolesArgs = {
    userRoles: UserRole[];
    requiredRoles: UserRole[];
};
export const hasRequiredRoles = ({ userRoles, requiredRoles }: HasRequiredRolesArgs): boolean => {
    return (
        userRoles.includes("admin") ||
        requiredRoles.length === 0 ||
        requiredRoles.some((role) => userRoles.includes(role))
    );
};

export const validateMessagePayload = (
    payload: unknown,
    validate?: (payload: unknown) => boolean,
    schemaValidate?: ValidateFunction
): { message: string; errors?: unknown } | undefined => {
    if (validate && !validate(payload)) {
        return { message: "Invalid Message Payload" };
    }
    if (schemaValidate && !schemaValidate(payload)) {
        return { message: "Message Schema Validation Failed", errors: schemaValidate.errors };
    }
    return undefined;
};

export const withQueryRunner = async <T = unknown>(
    dataSource: DataSource | undefined,
    options: UseQueryRunnerOptions | null | undefined,
    callback: (queryRunner: QueryRunner) => Promise<T>
) => {
    if (!dataSource || !options) {
        await callback(null as unknown as QueryRunner); // No query runner needed
        return;
    }

    const queryRunner = dataSource.createQueryRunner();
    try {
        await queryRunner.connect();
        if (options.transactional) await queryRunner.startTransaction();
        const response = await callback(queryRunner);
        if (queryRunner.isTransactionActive) await queryRunner.commitTransaction();
        return response;
    } catch (err) {
        if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
};
