import { FieldKeyType, FieldKeyWithType, GetFieldKeyByTypeResponse } from "@h2c/common";
import { AppLogger, RequestMetaData } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { FieldKeyEntity } from "../db/entities/FieldKeyEntity";

export class FieldKeysService {
    private queryRunner: QueryRunner;
    private requestMeta: RequestMetaData;
    constructor(requestMeta: FastifyRequest | RequestMetaData, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;
    }

    async getAllByType(types: FieldKeyType | FieldKeyType[]): Promise<GetFieldKeyByTypeResponse> {
        const repo = this.queryRunner.manager.getRepository(FieldKeyEntity);
        const typeList = Array.isArray(types) ? types : [types];

        const keys = await repo.find({
            where: typeList.map(type => ({ type })),
            order: { normalizedKey: "ASC" }
        });

        const result: GetFieldKeyByTypeResponse = {};
        for (const type of typeList) {
            result[type] = keys
                .filter(k => k.type === type)
                .map(k => ({ key: k.key, normalizedKey: k.normalizedKey }));
        }

        return result;
    }


    async add(type: FieldKeyType, key: string): Promise<FieldKeyWithType> {
        const repo = this.queryRunner.manager.getRepository(FieldKeyEntity);
        const trimmed = key.trim();

        const normalized = trimmed.toLowerCase();

        const existing = await repo.findOneBy({ type, normalizedKey: normalized });
        if (existing) return existing;

        const newKey = repo.create({
            type,
            key: trimmed,
            normalizedKey: normalized,
        });

        return await repo.save(newKey).then(key => ({ key: key.key, normalizedKey: key.normalizedKey, type: key.type } as FieldKeyWithType));
    }

    async remove(type: FieldKeyType, key: string): Promise<void> {
        const repo = this.queryRunner.manager.getRepository(FieldKeyEntity);
        const trimmed = key.trim();

        const normalized = trimmed.toLowerCase();

        await repo.delete({ type, normalizedKey: normalized });

    }

}