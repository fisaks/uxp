import { AppLogger, Route, UseQueryRunner } from "@uxp/bff-common";
import { UserSearchRequest, UserSearchResponse, UserSearchSchema } from "@uxp/common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { User } from "../../db/entities/User";
import { UserService } from "../../services/user.service";

export class UserSearchController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("post", "/user/search", { authenticate: true, roles: ["admin"], schema: UserSearchSchema })
    @UseQueryRunner()
    async search(req: FastifyRequest<{ Body: UserSearchRequest }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { filters, sort, pagination } = req.body;

        const query = queryRunner.manager.getRepository(User).createQueryBuilder("user");

        if (filters) {
            filters.forEach(({ field, value, operator }) => {
                switch (operator) {
                    case "eq":
                        query.andWhere(`user.${String(field)} = :value`, { value });
                        break;
                    case "lt":
                        query.andWhere(`user.${String(field)} < :value`, { value });
                        break;
                    case "gt":
                        query.andWhere(`user.${String(field)} > :value`, { value });
                        break;
                    case "contains":
                        query.andWhere(`user.${String(field)} LIKE :value`, { value: `%${value}%` });
                        break;
                    default:
                        throw new Error(`Unsupported operator: ${operator}`);
                }
            });
        }
        if (sort) {
            query.orderBy(`user.${String(sort.field)}`, sort.direction.toUpperCase() as "ASC" | "DESC");
        }

        // Apply pagination
        const { page, size } = pagination;
        query.skip((page - 1) * size).take(size);
        AppLogger.debug(req, { message: `Query: ${query.getSql()}` });

        const users = await query.getMany();
        const total = await query.getCount();

        return reply.send({
            data: users.map((m) => UserService.toUserPublic(m)),
            pagination: {
                currentPage: page,
                pageSize: size,
                totalPages: Math.ceil(total / size),
                totalItems: total,
            },
        } as UserSearchResponse);
    }
}
