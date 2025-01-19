import { AppLogger, Route, UseQueryRunner } from "@uxp/bff-common";
import { UserPubllic, UserSearchRequest, UserSearchResponse, UserSearchSchema } from "@uxp/common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Brackets, QueryRunner } from "typeorm";
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
        const { filters, sort, pagination, search } = req.body;

        const query = queryRunner.manager.getRepository(User).createQueryBuilder("user");

        if (filters) {
            filters.forEach(({ field, value, operator }, index) => {
                switch (operator) {
                    case "eq":
                        typeof value === "string"
                            ? query.andWhere(`user.${String(field)} = :value_${index} COLLATE utf8mb4_unicode_ci`, {
                                  [`value_${index}`]: value,
                              })
                            : query.andWhere(`user.${String(field)} = :value_${index}`, { [`value_${index}`]: value });
                        break;
                    case "lt":
                        query.andWhere(`user.${String(field)} < :value_${index}`, { [`value_${index}`]: value });
                        break;
                    case "gt":
                        query.andWhere(`user.${String(field)} > :value_${index}`, { [`value_${index}`]: value });
                        break;
                    case "contains":
                        query.andWhere(`user.${String(field)} LIKE :value_${index} COLLATE utf8mb4_unicode_ci`, {
                            [`value_${index}`]: `%${value}%`,
                        });
                        break;
                    default:
                        throw new Error(`Unsupported operator: ${operator}`);
                }
            });
        }
        if (search) {
            const fieldsToSearch: (keyof UserPubllic)[] = ["firstName", "lastName", "username", "email"];
            const searchWords = Array.isArray(search) ? search : [search];

            searchWords.forEach((word, index) => {
                query.andWhere(
                    new Brackets((qb) => {
                        fieldsToSearch.forEach((field) => {
                            console.log("word", word);
                            qb.orWhere(`user.${String(field)} LIKE :search_${index} COLLATE utf8mb4_unicode_ci`, {
                                [`search_${index}`]: `%${String(word)}%`,
                            });
                        });
                    })
                );
            });
        }
        if (sort) {
            sort.forEach((s) => {
                query.addOrderBy(`user.${String(s.field)}`, s.direction.toUpperCase() as "ASC" | "DESC");
            });
        }

        // Apply pagination
        const { page, size } = pagination;
        query.skip((page - 1) * size).take(size);
        AppLogger.debug(req, { message: `Query: ${query.getSql()}` });

        const users = await query.getMany();
        const total = await query.getCount();

        return reply.send({
            data: users.map((m) => UserService.toUserAdminView(m)),
            pagination: {
                currentPage: page,
                pageSize: size,
                totalPages: Math.ceil(total / size),
                totalItems: total,
            },
        } as UserSearchResponse);
    }
}
